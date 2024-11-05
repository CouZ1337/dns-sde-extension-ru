/**
 * URL pattern to match all URLs.
 */
const ALL_URLS_PATTERN = '<all_urls>';

/**
 * Type of the main frame.
 */
const MAIN_FRAME_TYPE = 'main_frame';

/**
 * Possible errors that can occur due to DNS blocking.
 */
const POSSIBLE_ERRORS = new Set([
    'net::ERR_CONNECTION_REFUSED',
    'net::ERR_NAME_NOT_RESOLVED',
    'net::ERR_CONNECTION_RESET',
    'net::ERR_ADDRESS_INVALID',
]);

/**
 * Path to the blocked page.
 */
const BLOCKED_PAGE_PATH = 'pages/blocked.html';

/**
 * Returns the hostname from the given URL.
 *
 * @param {string} url URL to get the hostname from.
 *
 * @returns {string|null} Parsed hostname or null if the hostname cannot be parsed.
 */
const getHostname = (url) => {
    let hostname = null;

    try {
        hostname = new URL(url).hostname;
    } catch (e) {
        console.error(`Error while getting hostname: ${e}`);
    }

    return hostname;
};

/**
 * Creates a URL to check if the given hostname is blocked by AdGuard DNS.
 *
 * @param {string} hostname Hostname to check.
 *
 * @returns {string} URL for a request to check the hostname.
 */
const createCheckingUrl = (hostname) => {
    return `https://dns.adguard.ch/resolve?name=${hostname}&sde=1`;
};

/**
 * Fetches the data to check if the given hostname is blocked by AdGuard DNS.
 *
 * @param {string} hostname Hostname to check.
 *
 * @returns {Object|null} Valid data object or null if data cannot be fetched or parsed.
 */
const fetchCheckData = async (hostname) => {
    const checkingUrl = createCheckingUrl(hostname);

    let data = null;

    try {
        const response = await fetch(checkingUrl);
        data = await response.json();
    } catch (e) {
        console.error(`Error while fetching or parsing data: ${e}`);
    }

    return data;
};

/**
 * @typedef {Object} ParsedExtraData
 * @property {string} whoBlocked Who blocked the request.
 * @property {string} reason Reason why the request was blocked.
 * @property {string} contactLink Link to contact the blocking party.
 */

/**
 * Parses the `Extra` value from the checking response.
 *
 * @param {any} extraValue Value of the `Extra` field.
 *
 * @returns {ParsedExtraData|null} Parsed data or null if the data is invalid.
 */
const parseExtraValue = (extraValue) => {
    if (extraValue.length === 0) {
        return null;
    }

    const { data } = extraValue[0];

    // data is a string which should be parsed:
    // eslint-disable-next-line max-len
    // "\n;; OPT PSEUDOSECTION:\n; EDNS: version 0; flags:; udp: 65535\n; EDE: 17 (Filtered): ({"j":"Filtered by AdGuard DNS","o":"AdGuard DNS","c":["mailto:support@adguard-dns.io"]})

    const rawFilteredDataStr = data.split('\n').pop();

    const filteredDataStr = rawFilteredDataStr
        .replace(/; EDE: 17 \(Filtered\): \(/, '')
        .replace(/\)$/, '');

    try {
        const rawData = JSON.parse(filteredDataStr);
        return {
            whoBlocked: rawData?.o,
            reason: rawData?.j,
            contactLink: rawData?.c[0],
        }
    } catch (e) {
        console.error('[parseExtraPart] Error: ', e);
    }

    return null;
};

/**
 * Checks whether the parsed extra data is about AdGuard DNS blocking.
 *
 * @param {ParsedExtraData} parsedExtraData Parsed extra data.
 *
 * @returns {boolean} True if the data is about AdGuard DNS blocking, false otherwise.
 */
const isAdGuardDnsBlocked = (parsedExtraData) => {
    const { whoBlocked, reason, contactLink } = parsedExtraData;

    if (!whoBlocked || !reason || !contactLink) {
        console.error('Missing required fields in Extra value');
        return false;
    }

    return true;
};

/**
 * Updated the blocked page with the parsed extra data.
 *
 * @param {number} tabId Tab ID to update.
 * @param {string} hostname Hostname of the blocked request.
 * @param {ParsedExtraData} parsedExtraData Parsed extra data.
 */
const updateBlockedPage = async (tabId, hostname, parsedExtraData) => {
    const { whoBlocked, reason, contactLink } = parsedExtraData;

    try {
        // pass the data to the blocked page via query params
        const paramsStr = `?whoBlocked=${whoBlocked}&hostname=${hostname}&reason=${reason}&contactLink=${contactLink}`;

        await chrome.tabs.update(tabId, {
            url: `${chrome.runtime.getURL(BLOCKED_PAGE_PATH)}${paramsStr}`,
        });
    } catch (e) {
        console.error(`Error while updating blocked page: ${e}`);
    }
};

/**
 * `webRequest.onErrorOccurred` is preferred over `webNavigation.onErrorOccurred` because it fires earlier.
 */
chrome.webRequest.onErrorOccurred.addListener(
    async (details) => {
        if (details.type === MAIN_FRAME_TYPE && POSSIBLE_ERRORS.has(details.error)) {
            const hostname = getHostname(details.url);
            if (!hostname) {
                console.error(`Cannot get hostname from the URL: ${details.url}`);
                return;
            }

            const checkingResponse = await fetchCheckData(hostname);

            if (!checkingResponse) {
                console.error('Cannot fetch data to check if the request is blocked by AdGuard DNS');
                return;
            }

            const { Extra } = checkingResponse;
            if (!Extra) {
                console.info('Request is not blocked by AdGuard DNS');
                return;
            }

            const parsedExtraData = parseExtraValue(Extra);
            if (!parsedExtraData) {
                console.error('Extra value is not valid');
                return;
            }

            if (!isAdGuardDnsBlocked(parsedExtraData)) {
                console.info('Request is not blocked by AdGuard DNS');
                return;
            }

            updateBlockedPage(details.tabId, hostname, parsedExtraData);
        }
    },
    {
        urls: [ALL_URLS_PATTERN],
        types: [MAIN_FRAME_TYPE],
    }
);

chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        // open the options page after installation
        chrome.runtime.openOptionsPage(() => {
            if (chrome.runtime.lastError) {
                console.error(`Error while opening options page: ${chrome.runtime.lastError}`);
            }
        });
    }
});

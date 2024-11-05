/**
 * Minimal value of window.history.length for a blocked page —
 * when a new tab is opened (+1) and the blocked page is shown after redirection (+1).
 * That's why it is not usual `1` but `2`.
 */
const MIN_BLOCKED_PAGE_HISTORY_LENGTH = 2;

/**
 * Replaces placeholders in the HTML with the values passed from the URL query params.
 *
 * Should be used in `blocked.html`.
 */
const replacePlaceholders = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const whoBlocked = urlParams.get('whoBlocked');
    const hostname = urlParams.get('hostname');
    const reason = urlParams.get('reason');
    const contactLink = urlParams.get('contactLink');

    const titleElement = document.getElementById('whoBlocked');
    titleElement.textContent = titleElement.textContent.replace('${whoBlocked}', whoBlocked);

    const descriptionElement = document.getElementById('reason');
    descriptionElement.textContent = descriptionElement.textContent.replace('${hostname}', hostname);
    descriptionElement.textContent = descriptionElement.textContent.replace('${reason}', reason);

    document.getElementById('contactLink').href = contactLink;
};

/**
 * Handles the 'Go back' button click event:
 * - if page was opened in the same tab, goes back to the previous page;
 * - if page was opened in a new tab, closes the tab.
 */
const handleGoBackButtonClick = () => {
    const goBackButton = document.getElementById('backBtn');
    goBackButton.addEventListener('click', () => {
        // if the history length is greater than 2, go back to the previous page
        if (window.history.length > MIN_BLOCKED_PAGE_HISTORY_LENGTH) {
            try {
                window.history.go(-MIN_BLOCKED_PAGE_HISTORY_LENGTH);
            } catch (e) {
                console.error(`Error while going back: ${e}`);
            }
        } else {
            window.close();
        }
    });
};

/**
 * Handles click events on _toggle details_.
 */
const handleToggleDetailsButtonClick = () => {
    const toggleButtons = document.querySelectorAll('.faq-item__toggle-btn');

    toggleButtons.forEach((button) => {
        button.addEventListener('click', () => {
            button.classList.toggle('active');

            const content = button.closest('.faq-item').querySelector('.faq-item__content');
            content.classList.toggle('active');
        });
    });
};

const main = () => {
    document.addEventListener('DOMContentLoaded', async () => {
        replacePlaceholders();
        handleGoBackButtonClick();
        handleToggleDetailsButtonClick();
    });
};

main();

/* =========================================
   View Utils
   ========================================= */

export const ICONS = {
    DELETE: '<svg viewBox="0 0 24 24" class="icon-small"><path d="M20.4706 6.0625L14.5536 12L20.4706 17.9375C20.8235 18.2708 21 18.6875 21 19.1875C21 19.6875 20.8235 20.1146 20.4706 20.4687C20.1176 20.8229 19.692 21 19.1938 21C18.6955 21 18.2699 20.8333 17.917 20.5L12 14.5625L6.08305 20.5C5.75087 20.8333 5.33564 21 4.83737 21C4.3391 21 3.91349 20.8229 3.56055 20.4687C3.20761 20.1146 3.03114 19.6875 3.03114 19.1875C3.03114 18.6875 3.20761 18.2708 3.56055 17.9375L9.44637 12L3.52941 6.0625C3.17647 5.72917 3 5.3125 3 4.8125C3 4.3125 3.17647 3.88542 3.52941 3.53125C3.88235 3.17708 4.30796 3 4.80623 3C5.3045 3 5.73011 3.16667 6.08305 3.5L12 9.4375L17.917 3.5C18.2699 3.16667 18.6955 3 19.1938 3C19.692 3 20.1176 3.17708 20.4706 3.53125C20.8235 3.88542 21 4.3125 21 4.8125C21 5.3125 20.8235 5.72917 20.4706 6.0625Z" fill="currentColor"/></svg>',
    CONFIRM: '<svg viewBox="0 0 24 24" class="icon-small"><path d="M9.59547 14.7251C9.76036 14.5637 9.84967 14.483 9.86341 14.483C13.4909 9.23778 16.0261 5.59975 17.4688 3.5689C17.7161 3.21922 17.9635 3.03093 18.2108 3.00403C18.4581 2.97714 18.781 3.08473 19.1795 3.32682C19.3856 3.44786 19.8184 3.75719 20.478 4.25482C21.0688 4.73899 21.1581 5.21644 20.7459 5.68717C19.6879 7.18004 18.1077 9.4328 16.0054 12.4454C13.9031 15.4581 12.3161 17.7176 11.2443 19.2239C10.9008 19.6812 10.523 19.9367 10.1107 19.9905C9.69852 20.0443 9.30005 19.8695 8.91531 19.466L8.64737 19.2239L3.39161 14.0594C2.86946 13.5483 2.86946 13.0372 3.39161 12.5261C3.51527 12.3782 3.64581 12.237 3.78321 12.1025C3.92062 11.9814 4.06489 11.8537 4.21604 11.7192C4.35345 11.5847 4.44963 11.4905 4.5046 11.4367C4.84811 11.0871 5.13666 10.9122 5.37025 10.9122C5.60384 10.9122 5.89239 11.0871 6.23591 11.4367L9.51303 14.6444C9.51303 14.604 9.5199 14.5839 9.53364 14.5839L9.59547 14.7049V14.7251Z" fill="currentColor"/></svg>',
    CANCEL: '<svg viewBox="0 0 24 24" class="icon-small"><path d="M13.0918 3.6213C13.5829 3.12432 14.3927 3.12163 14.8818 3.62521L19.3965 8.27364C19.5187 8.3995 19.6035 8.55737 19.6055 8.73751C19.6073 8.91848 19.5249 9.0783 19.4014 9.20626C18.8163 9.81239 17.3115 11.3531 14.8877 13.8273C14.3964 14.3289 13.5873 14.3284 13.0977 13.8244L13.0752 13.8019C12.6041 13.3169 12.6042 12.5448 13.0752 12.0598L13.8398 11.2727C14.3018 10.7971 13.9647 10.0002 13.3018 10.0002H10.0146C8.83775 10.0003 7.84052 10.4242 7.00879 11.2805L7.00684 11.2815C6.17702 12.1202 5.76181 13.1494 5.76172 14.3849C5.76172 15.6033 6.17677 16.6339 7.00879 17.4904C7.83992 18.3299 8.83675 18.7462 10.0146 18.7463H16.4883C17.1785 18.7464 17.7383 19.306 17.7383 19.9963V20.0676C17.7383 20.7578 17.1785 21.3174 16.4883 21.3176H10.0146C8.78787 21.3175 7.65687 21.001 6.62695 20.3683C5.60209 19.7387 4.7824 18.9033 4.1709 17.8654L4.16992 17.8644C3.55628 16.8059 3.25 15.6439 3.25 14.3849C3.25007 13.1105 3.55624 11.9488 4.1709 10.9055C4.78211 9.85157 5.60154 9.0081 6.62695 8.37814C7.65691 7.74541 8.78781 7.42897 10.0146 7.42892H13.3018C13.9646 7.42892 14.3016 6.63199 13.8398 6.15646L13.0811 5.37423C12.6062 4.88504 12.6148 4.10403 13.0918 3.6213Z" fill="currentColor" stroke="currentColor" stroke-width="0.5"/></svg>',
    ARROW: '<svg viewBox="0 0 24 24" class="icon-tiny"><path d="M8.59 16.59L13.17 12L8.59 7.41L10 6L16 12L10 18L8.59 16.59Z" fill="currentColor"/></svg>'
};

export const ICON_PATH = '/Asset/Icon/Layout/MainArea/PanelUni/SidePanel/LeftSidePanel/LayerListGroup/';

/**
 * Creates a delete control with confirmation.
 * @param {Function} onDelete - Callback when delete is confirmed.
 * @returns {DocumentFragment}
 */
export function createDeleteControl(onDelete) {
    const container = document.createDocumentFragment();

    // 1. Delete Button
    const delBtn = document.createElement('div');
    delBtn.className = 'list-delete';
    delBtn.innerHTML = ICONS.DELETE;

    // 2. Confirmation Container
    const confirmContainer = document.createElement('div');
    confirmContainer.className = 'list-delete-confirm';
    confirmContainer.style.display = 'none';

    // Confirm Button
    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'list-confirm-btn danger';
    confirmBtn.innerHTML = ICONS.CONFIRM;
    
    confirmBtn.onclick = (e) => {
        e.stopPropagation();
        onDelete();
    };

    // Cancel Button
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'list-confirm-btn';
    cancelBtn.innerHTML = ICONS.CANCEL;

    cancelBtn.onclick = (e) => {
        e.stopPropagation();
        delBtn.style.display = 'flex';
        confirmContainer.style.display = 'none';
    };

    confirmContainer.appendChild(confirmBtn);
    confirmContainer.appendChild(cancelBtn);

    // Toggle Logic
    delBtn.onclick = (e) => {
        e.stopPropagation();
        delBtn.style.display = 'none';
        confirmContainer.style.display = 'flex';
    };

    container.appendChild(delBtn);
    container.appendChild(confirmContainer);

    return container;
}

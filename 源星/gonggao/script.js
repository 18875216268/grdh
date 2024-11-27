// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Get references to the buttons and overlay
    const cancelButton = document.querySelector('.公告弹窗取消按钮');
    const confirmButton = document.querySelector('.公告弹窗确认按钮');
    const overlay = document.querySelector('.overlay');

    // Event listener for cancel button
    cancelButton.addEventListener('click', () => {
        // Redirect to the specified website
        window.location.href = 'https://quruanpu.cn';
    });

    // Event listener for confirm button
    confirmButton.addEventListener('click', () => {
        // Hide the overlay, effectively closing the popup
        overlay.style.display = 'none';
    });
});
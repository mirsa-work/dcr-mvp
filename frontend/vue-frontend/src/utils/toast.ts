// This utility uses Bootstrap's toast component

// Show a toast notification
export function showToast(message: string, type: 'success' | 'danger' = 'success', duration: number = 3000) {
  const toastId = `toast-${Date.now()}`;
  const toastClass = type === 'success' ? 'bg-success' : 'bg-danger';

  // Create toast element
  const toast = document.createElement('div');
  toast.id = toastId;
  toast.classList.add('toast', toastClass, 'text-white');
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');
  toast.setAttribute('aria-atomic', 'true');
  
  // Add toast body
  const toastBody = document.createElement('div');
  toastBody.classList.add('toast-body');
  toastBody.textContent = message;
  toast.appendChild(toastBody);

  // Find or create toast container
  let toastContainer = document.getElementById('toastContainer');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toastContainer';
    toastContainer.classList.add('toast-container', 'position-fixed', 'bottom-0', 'end-0', 'p-3');
    document.body.appendChild(toastContainer);
  }

  // Add toast to container
  toastContainer.appendChild(toast);

  // Initialize and show Bootstrap toast
  // @ts-ignore - Bootstrap is loaded globally
  const bsToast = new bootstrap.Toast(toast, { delay: duration });
  bsToast.show();

  // Remove toast after hidden
  toast.addEventListener('hidden.bs.toast', () => {
    toast.remove();
  });
} 
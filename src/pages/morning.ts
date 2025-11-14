// Page entry for morning checkin
import '../components/index.ts';

// Attach a global listener so any component emitting 'cancel' will navigate back to the index page
window.addEventListener('cancel', () => {
  location.href = 'index.html';
});

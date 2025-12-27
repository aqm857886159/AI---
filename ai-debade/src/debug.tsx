// DEBUG HELPER - Paste this in browser console to diagnose issues

console.log('=== AI Debade Debug Tool ===');

// 1. Check if revision paragraphs exist
const revisionParagraphs = document.querySelectorAll('[data-revision-id]');
console.log(`✓ Found ${revisionParagraphs.length} revision paragraphs with data-revision-id`);

if (revisionParagraphs.length === 0) {
  console.error('❌ NO REVISION PARAGRAPHS FOUND! The decoration may not be rendering.');
} else {
  revisionParagraphs.forEach((el, i) => {
    const id = el.getAttribute('data-revision-id');
    console.log(`  Paragraph ${i}: ID = ${id}`);
  });
}

// 2. Check if buttons exist
const acceptButtons = document.querySelectorAll('.revision-btn.accept');
const rejectButtons = document.querySelectorAll('.revision-btn.reject');
console.log(`✓ Found ${acceptButtons.length} accept buttons`);
console.log(`✓ Found ${rejectButtons.length} reject buttons`);

// 3. Test if onclick handlers are attached
if (acceptButtons.length > 0) {
  const firstAccept = acceptButtons[0] as HTMLButtonElement;
  console.log(`  First accept button onclick:`, firstAccept.onclick ? '✓ EXISTS' : '❌ MISSING');
}

// 4. Monitor events
let eventCount = 0;
const monitorEvent = (eventName: string) => {
  window.addEventListener(eventName, (e) => {
    eventCount++;
    console.log(`🎯 Event #${eventCount}: ${eventName}`, (e as CustomEvent).detail);
  });
};

monitorEvent('preview-change');
monitorEvent('accept-paragraph-change');
monitorEvent('reject-paragraph-change');
console.log('✓ Event monitors installed. Hover/click buttons to see events.');

// 5. Manual test function
(window as any).testPreview = (changeId: string) => {
  console.log(`Testing preview for changeId: ${changeId}`);
  const event = new CustomEvent('preview-change', {
    detail: { changeId, type: 'future', active: true }
  });
  window.dispatchEvent(event);
  console.log('Event dispatched. Check if paragraph got .preview-future class');
};

console.log('\n📋 INSTRUCTIONS:');
console.log('1. Trigger AI rewrite to create revision paragraphs');
console.log('2. Hover over ✓ or ✗ buttons');
console.log('3. Click buttons');
console.log('4. Watch for events in console');
console.log('\nTo manually test: testPreview("REVISION_ID_HERE")');

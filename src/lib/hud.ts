/**
 * Displays a lightweight modal overlay in the active page DOM to collect 
 * user inputs for unresolved dynamic placeholders in a template.
 */
export function showHudPrompt(
  placeholders: string[],
  onSubmit: (values: Record<string, string>) => void,
  onCancel: () => void
): void {
  // Prevent duplicate overlays
  const existing = document.getElementById('clipstaff-hud-overlay');
  if (existing) {
    existing.remove();
  }

  // Create backdrop overlay
  const overlay = document.createElement('div');
  overlay.id = 'clipstaff-hud-overlay';
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.zIndex = '999999';
  overlay.style.background = 'rgba(5, 5, 5, 0.8)';
  overlay.style.backdropFilter = 'blur(4px)';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.fontFamily = 'Inter, system-ui, sans-serif';
  overlay.style.color = '#d0d6e0'; // mist

  // Create dialog container
  const dialog = document.createElement('div');
  dialog.style.width = '100%';
  dialog.style.maxWidth = '380px';
  dialog.style.background = '#0f1011'; // carbon
  dialog.style.border = '1px solid #23252a'; // graphite
  dialog.style.borderRadius = '12px';
  dialog.style.boxShadow = '0 20px 40px -15px rgba(0, 0, 0, 0.7)';
  dialog.style.overflow = 'hidden';
  dialog.style.padding = '24px';
  dialog.style.display = 'flex';
  dialog.style.flexDirection = 'column';
  dialog.style.gap = '16px';
  dialog.style.boxSizing = 'border-box';

  // Title section
  const title = document.createElement('h3');
  title.innerText = 'Template Parameters';
  title.style.margin = '0';
  title.style.fontSize = '14px';
  title.style.fontWeight = 'bold';
  title.style.color = '#ffffff';
  title.style.textTransform = 'uppercase';
  title.style.letterSpacing = '0.05em';
  dialog.appendChild(title);

  // Form container
  const form = document.createElement('form');
  form.style.display = 'flex';
  form.style.flexDirection = 'column';
  form.style.gap = '14px';

  const inputs: Record<string, HTMLInputElement> = {};

  placeholders.forEach((placeholder) => {
    const group = document.createElement('div');
    group.style.display = 'flex';
    group.style.flexDirection = 'column';
    group.style.gap = '6px';

    const label = document.createElement('label');
    // Format label (e.g. custom_variable -> Custom Variable)
    label.innerText = placeholder
      .replace(/[\s_-]+/g, ' ')
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    label.style.fontSize = '9px';
    label.style.fontWeight = 'bold';
    label.style.textTransform = 'uppercase';
    label.style.color = '#62666d'; // muted
    label.style.marginLeft = '4px';

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = `Enter ${placeholder.replace(/_/g, ' ')}...`;
    input.style.width = '100%';
    input.style.background = '#08090a'; // void
    input.style.border = '1px solid #23252a';
    input.style.borderRadius = '6px';
    input.style.padding = '10px 14px';
    input.style.fontSize = '13px';
    input.style.color = '#ffffff';
    input.style.boxSizing = 'border-box';
    input.style.outline = 'none';
    input.style.transition = 'border-color 0.15s ease, box-shadow 0.15s ease';

    // Focus state animations
    input.addEventListener('focus', () => {
      input.style.borderColor = '#e4f222';
      input.style.boxShadow = '0 0 8px rgba(228, 242, 34, 0.15)';
    });
    input.addEventListener('blur', () => {
      input.style.borderColor = '#23252a';
      input.style.boxShadow = 'none';
    });

    group.appendChild(label);
    group.appendChild(input);
    form.appendChild(group);

    inputs[placeholder] = input;
  });

  // Action buttons
  const actions = document.createElement('div');
  actions.style.display = 'flex';
  actions.style.justifyContent = 'flex-end';
  actions.style.gap = '8px';
  actions.style.marginTop = '8px';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.innerText = 'Cancel';
  cancelBtn.style.background = 'transparent';
  cancelBtn.style.border = '1px solid transparent';
  cancelBtn.style.color = '#62666d';
  cancelBtn.style.fontSize = '12px';
  cancelBtn.style.fontWeight = 'medium';
  cancelBtn.style.padding = '8px 16px';
  cancelBtn.style.borderRadius = '6px';
  cancelBtn.style.cursor = 'pointer';
  cancelBtn.style.transition = 'color 0.15s ease';
  cancelBtn.addEventListener('mouseenter', () => cancelBtn.style.color = '#d0d6e0');
  cancelBtn.addEventListener('mouseleave', () => cancelBtn.style.color = '#62666d');
  cancelBtn.addEventListener('click', () => {
    overlay.remove();
    onCancel();
  });

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.innerText = 'Expand';
  submitBtn.style.background = '#e4f222'; // acid-lime
  submitBtn.style.border = '1px solid transparent';
  submitBtn.style.color = '#08090a';
  submitBtn.style.fontSize = '12px';
  submitBtn.style.fontWeight = 'bold';
  submitBtn.style.padding = '8px 20px';
  submitBtn.style.borderRadius = '6px';
  submitBtn.style.cursor = 'pointer';
  submitBtn.style.transition = 'background-color 0.15s ease, transform 0.1s ease';
  submitBtn.addEventListener('mouseenter', () => submitBtn.style.backgroundColor = '#f2fc60');
  submitBtn.addEventListener('mouseleave', () => submitBtn.style.backgroundColor = '#e4f222');
  submitBtn.addEventListener('mousedown', () => submitBtn.style.transform = 'scale(0.97)');
  submitBtn.addEventListener('mouseup', () => submitBtn.style.transform = 'scale(1)');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const values: Record<string, string> = {};
    placeholders.forEach((placeholder) => {
      values[placeholder] = inputs[placeholder]?.value || '';
    });
    overlay.remove();
    onSubmit(values);
  });

  actions.appendChild(cancelBtn);
  actions.appendChild(submitBtn);
  form.appendChild(actions);
  dialog.appendChild(form);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  // Focus first input automatically
  const firstKey = placeholders[0];
  if (firstKey && inputs[firstKey]) {
    setTimeout(() => inputs[firstKey].focus(), 50);
  }
}

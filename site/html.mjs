// Text made safe to place in the HTML the site build writes, as content or as a quoted attribute value.
export const escapeHtml = (text) => text.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

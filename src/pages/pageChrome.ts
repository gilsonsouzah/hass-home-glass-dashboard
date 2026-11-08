const PERMANENT_SELECTORS = ['.hg-header', '.permanent-chips'];

/** Clears the dynamic content of a page and puts its title before the permanent chips. */
export function resetPage(container: HTMLElement, title: string): void {
  Array.from(container.children).forEach((child) => {
    if (!PERMANENT_SELECTORS.some((selector) => child.matches(selector))) child.remove();
  });

  const titleElement = document.createElement('h1');
  titleElement.className = 'apple-page-title';
  titleElement.textContent = title;

  const chips = container.querySelector('.permanent-chips');
  if (chips) {
    container.insertBefore(titleElement, chips);
  } else {
    container.appendChild(titleElement);
  }
}

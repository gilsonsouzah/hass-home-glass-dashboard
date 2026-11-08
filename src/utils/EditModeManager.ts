export class EditModeManager {
  private _editMode = false;
  private onEditModeChange: (editMode: boolean) => void;

  constructor(onEditModeChange: (editMode: boolean) => void) {
    this.onEditModeChange = onEditModeChange;
  }

  get editMode(): boolean {
    return this._editMode;
  }

  toggleEditMode() {
    this._editMode = !this._editMode;
    this.onEditModeChange(this._editMode);
  }

  static updateEntityWrapperStyles(container: HTMLElement, editMode: boolean) {
    container.querySelectorAll('.entity-card-wrapper').forEach((wrapper) => {
      wrapper.classList.toggle('edit-mode', editMode);

      const card = wrapper.querySelector('home-glass-card') as any;
      if (typeof card?.refreshEditMode === 'function') card.refreshEditMode();
    });
  }
}

export class GuideManager {
    constructor(model) {
        this.model = model;
    }

    get data() { return this.model.data; }

    addGuide(axis = 'x', position = 100) {
        if (!this.data || !this.data.settings) return null;
        const id = this.model._generateUniqueId('elem_guide_');
        const newGuide = {
            id: id,
            axis: axis,
            position: position,
            visible: true,
            locked: false
        };
        
        if (!this.data.settings.guides) this.data.settings.guides = [];
        this.data.settings.guides.push(newGuide);

        window.dispatchEvent(new CustomEvent('projectGuidesChanged', { detail: this.data.settings.guides }));
        return newGuide;
    }

    removeGuide(id) {
        if (!this.data || !this.data.settings || !this.data.settings.guides) return;
        const index = this.data.settings.guides.findIndex(g => g.id === id);
        if (index > -1) {
            this.data.settings.guides.splice(index, 1);
            window.dispatchEvent(new CustomEvent('projectGuidesChanged', { detail: this.data.settings.guides }));
        }
    }

    updateGuide(id, position) {
        if (!this.data || !this.data.settings || !this.data.settings.guides) return;
        const guide = this.data.settings.guides.find(g => g.id === id);
        if (guide) {
            guide.position = position;
            window.dispatchEvent(new CustomEvent('projectGuidesChanged', { detail: this.data.settings.guides }));
        }
    }

    toggleGuideLock(id) {
        if (!this.data || !this.data.settings || !this.data.settings.guides) return;
        const guide = this.data.settings.guides.find(g => g.id === id);
        if (guide) {
            guide.locked = !guide.locked;
            window.dispatchEvent(new CustomEvent('projectGuidesChanged', { detail: this.data.settings.guides }));
        }
    }

    getGuides() {
        return (this.data && this.data.settings && this.data.settings.guides) ? this.data.settings.guides : [];
    }
}

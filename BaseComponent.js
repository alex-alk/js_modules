export default class BaseComponent extends HTMLElement {
  constructor() {
    super();
    this.state = {};
  }
  connectedCallback() {
    if (this.render) this.render();
  }
  setState(state) {
    this.state = { ...this.state, ...state };
    this.render();
  }
}
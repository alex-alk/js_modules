export function createComponent(html) {
    const template = document.createElement('template')
    template.innerHTML = html
    const component = template.content
    return component
}
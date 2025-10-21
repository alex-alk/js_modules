export default class Router {

    constructor(routes, basePath = '') {
        this.subscribers = []
        this.routes = routes
        this.basePath = basePath
        this.rootElem = document.querySelector('#app')
        this.currentMainLayoutPath = null
        this.currentChildLayoutPath = null
        this.layoutContainer = null
        // listen to history changes
        window.addEventListener('popstate', () => this.route());
    }

    // Remove base path prefix from full path to get route key
    stripBase(path) { // path = basepath + real path
        
        if (this.basePath && path.startsWith(this.basePath)) {
            const stripped = path.slice(this.basePath.length);
            return stripped;
        }
        return path;
    }

    // Navigate to a route programmatically
    navigate(fullPath) {
        if (fullPath !== location.pathname) {
            history.pushState({}, '', fullPath);
            this.route();
        }
    }

    pathToRegex(path) {
        const regex = path
            .replace(/:[^\s/]+/g, '([^/]+)')  // match dynamic segments
            .replace(/\//g, '\\/');
        return new RegExp('^' + regex + '$');
    }

    findRoute(path, routes) {
        // looping main routes
        for (const matchedRoute of routes) {
            const regex = this.pathToRegex(matchedRoute.path);
            if (regex.test(path)) {
                // ex: this will match / with / as child route and other main routes
                if (matchedRoute.children) {
                    for (const matchedChildRoute of matchedRoute.children) {
                        const childRegex = this.pathToRegex(matchedChildRoute.path);
                        if (childRegex.test(path)) {
                            return { matchedRoute, matchedChildRoute };
                        }
                    }
                } else {
                    return { matchedRoute, matchedChildRoute: null };
                }
            }
        }

        // matching everyting else
        for (const matchedRoute of routes) {

            if (matchedRoute.children) {
                for (const matchedChildRoute of matchedRoute.children) {
                    const childRegex = this.pathToRegex(matchedChildRoute.path);
                    if (childRegex.test(path)) {
                        return { matchedRoute, matchedChildRoute };
                    }
                }
            }
        }

        return { matchedRoute: null, matchedChildRoute: null };
    }

    findComponentByPath(path, routes) {
        const match = this.findRoute(path, routes);
        if (match.matchedRoute) {
            return match.matchedRoute
        }

        // fallback to 404
        const notFound = this.findRoute('/404', routes);
        return notFound ? notFound.matchedRoute.component : null;
    }

    notifyRouteChange(routePath) {
        // for each subscriber, nofity with url as parameter
        for (const subscriber of this.subscribers) {
            subscriber(routePath)
        }
    }

    subscribeToRouteChange(functionObj) {
        this.subscribers.push(functionObj)
    }

    // Match current URL to route and render component
    async route() {
        const routePath = this.stripBase(location.pathname);
        this.notifyRouteChange(routePath)
        const match = this.findRoute(routePath, this.routes);

        let RouteComponent = null;

        if (match.matchedRoute) {
            RouteComponent = match.matchedRoute.component;
        } else {
            const notFound = this.findRoute('/404', this.routes);
            RouteComponent = notFound ? notFound.matchedRoute.component : null;
        }

        if (!RouteComponent) {
            console.error(`No route matched for path: ${routePath}`);
            return;
        }

        if (RouteComponent.constructor.name === 'AsyncFunction') {
            RouteComponent = await RouteComponent();
        }

        const mainLayoutPath = match.matchedRoute.path;

        if (this.currentMainLayoutPath !== mainLayoutPath) {
            // instanțiem layout
            const layoutInstance = new RouteComponent();
            const layoutEl = await layoutInstance.getElement();

            if (match.matchedChildRoute) {
                let Child = match.matchedChildRoute.component;

                if (Child.constructor.name === 'AsyncFunction') {
                    Child = await Child();
                }

                const childInstance = new Child();
                const childEl = await childInstance.getElement();
                const parentRouterView = layoutEl.querySelector('router-view');
                this.layoutContainer = parentRouterView.parentElement;

                if (parentRouterView) {
                    this.layoutContainer.replaceChildren(childEl);
                }
            }

            this.rootElem.replaceChildren(layoutEl);
            this.currentMainLayoutPath = mainLayoutPath;
        } else {
            // schimb doar child
            if (match.matchedChildRoute) {
                const childLayoutPath = match.matchedChildRoute.path;

                if (this.currentChildLayoutPath !== childLayoutPath) {
                    let Child = match.matchedChildRoute.component;

                    if (Child.constructor.name === 'AsyncFunction') {
                        Child = await Child();
                    }

                    const childInstance = new Child();
                    const childEl = await childInstance.getElement();
                    this.layoutContainer.replaceChildren(childEl);
                    this.currentChildLayoutPath = childLayoutPath;
                }
            }
        }
    }



    // Start the router: initial route render, listen to clicks
    start() {
        this.route();

        document.body.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (!link) return;

            let to = link.getAttribute('href');
            if (!to) return;
            if (!to.startsWith('/')) return; // only handle absolute paths
            
            to = this.basePath + to

            // Only handle links inside the base path
            if (this.basePath === '' || to.startsWith(this.basePath + '/') || to === this.basePath) {
                e.preventDefault();
                //const realPath = this.stripBase(to);
                this.navigate(to);
            }
        });
    }
}
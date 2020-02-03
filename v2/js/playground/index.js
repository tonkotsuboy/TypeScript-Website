define(["require", "exports", "./sidebar/showJS", "./createElements", "./sidebar/showDTS", "./sidebar/runtime", "./exporter", "./createUI", "./getExample", "./monaco/ExampleHighlight", "./createConfigDropdown", "./sidebar/showErrors", "./sidebar/options"], function (require, exports, showJS_1, createElements_1, showDTS_1, runtime_1, exporter_1, createUI_1, getExample_1, ExampleHighlight_1, createConfigDropdown_1, showErrors_1, options_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const defaultPluginFactories = [
        showJS_1.compiledJSPlugin,
        showDTS_1.showDTSPlugin,
        showErrors_1.showErrors,
        runtime_1.runPlugin,
        options_1.optionsPlugin,
    ];
    exports.setupPlayground = (sandbox, monaco, config) => {
        const playgroundParent = sandbox.getDomNode().parentElement.parentElement.parentElement;
        const dragBar = createElements_1.createDragBar();
        playgroundParent.appendChild(dragBar);
        const sidebar = createElements_1.createSidebar();
        playgroundParent.appendChild(sidebar);
        const tabBar = createElements_1.createTabBar();
        sidebar.appendChild(tabBar);
        const container = createElements_1.createPluginContainer();
        sidebar.appendChild(container);
        const plugins = [];
        const tabs = [];
        const registerPlugin = (plugin) => {
            plugins.push(plugin);
            const tab = createElements_1.createTabForPlugin(plugin);
            tabs.push(tab);
            const tabClicked = e => {
                const previousPlugin = currentPlugin();
                const newTab = e.target;
                const newPlugin = plugins.find(p => p.displayName == newTab.textContent);
                createElements_1.activatePlugin(newPlugin, previousPlugin, sandbox, tabBar, container);
            };
            tabBar.appendChild(tab);
            tab.onclick = tabClicked;
        };
        const currentPlugin = () => {
            const selectedTab = tabs.find(t => t.classList.contains('active'));
            return plugins[tabs.indexOf(selectedTab)];
        };
        const initialPlugins = defaultPluginFactories.map(f => f());
        initialPlugins.forEach(p => registerPlugin(p));
        // Choose which should be selected
        const priorityPlugin = plugins.find(plugin => plugin.shouldBeSelected && plugin.shouldBeSelected());
        const selectedPlugin = priorityPlugin || plugins[0];
        const selectedTab = tabs[plugins.indexOf(selectedPlugin)];
        selectedTab.onclick({ target: selectedTab });
        let debouncingTimer = false;
        sandbox.editor.onDidChangeModelContent(_event => {
            const plugin = currentPlugin();
            if (plugin.modelChanged)
                plugin.modelChanged(sandbox, sandbox.getModel());
            // This needs to be last in the function
            if (debouncingTimer)
                return;
            debouncingTimer = true;
            setTimeout(() => {
                debouncingTimer = false;
                playgroundDebouncedMainFunction();
                // Only call the plugin function once every 0.3s
                if (plugin.modelChangedDebounce && plugin.displayName === currentPlugin().displayName) {
                    plugin.modelChangedDebounce(sandbox, sandbox.getModel());
                }
            }, 300);
        });
        // Sets the URL and storage of the sandbox string
        const playgroundDebouncedMainFunction = () => {
            const alwaysUpdateURL = !localStorage.getItem('disable-save-on-type');
            if (alwaysUpdateURL) {
                const newURL = sandbox.getURLQueryWithCompilerOptions(sandbox);
                window.history.replaceState({}, '', newURL);
            }
            localStorage.setItem('sandbox-history', sandbox.getText());
        };
        // When any compiler flags are changed, trigger a potential change to the URL
        sandbox.setDidUpdateCompilerSettings(() => {
            playgroundDebouncedMainFunction();
            const model = sandbox.editor.getModel();
            const plugin = currentPlugin();
            if (model && plugin.modelChanged)
                plugin.modelChanged(sandbox, model);
            if (model && plugin.modelChangedDebounce)
                plugin.modelChangedDebounce(sandbox, model);
        });
        // Setup working with the existing UI, once it's loaded
        // Versions of TypeScript
        // Set up the label for the dropdown
        document.querySelectorAll('#versions > a').item(0).innerHTML = 'v' + sandbox.ts.version + " <span class='caret'/>";
        // Add the versions to the dropdown
        const versionsMenu = document.querySelectorAll('#versions > ul').item(0);
        const allVersions = ["3.8.0-beta", ...sandbox.supportedVersions];
        allVersions.forEach((v) => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.textContent = v;
            a.href = '#';
            li.onclick = () => {
                const currentURL = sandbox.getURLQueryWithCompilerOptions(sandbox);
                const params = new URLSearchParams(currentURL.split('#')[0]);
                params.set('ts', v);
                const hash = document.location.hash.length ? document.location.hash : '';
                const newURL = `${document.location.protocol}//${document.location.host}${document.location.pathname}?${params}${hash}`;
                // @ts-ignore - it is allowed
                document.location = newURL;
            };
            li.appendChild(a);
            versionsMenu.appendChild(li);
        });
        // Support dropdowns
        document.querySelectorAll('.navbar-sub li.dropdown > a').forEach(link => {
            const a = link;
            a.onclick = _e => {
                if (a.parentElement.classList.contains('open')) {
                    document.querySelectorAll('.navbar-sub li.open').forEach(i => i.classList.remove('open'));
                }
                else {
                    document.querySelectorAll('.navbar-sub li.open').forEach(i => i.classList.remove('open'));
                    a.parentElement.classList.toggle('open');
                    const exampleContainer = a
                        .closest('li')
                        .getElementsByTagName('ul')
                        .item(0);
                    // SEt exact height and widths for the popovers for the main playground navigation
                    const isPlaygroundSubmenu = !!a.closest('nav');
                    if (isPlaygroundSubmenu) {
                        const playgroundContainer = document.getElementById('playground-container');
                        exampleContainer.style.height = `calc(${playgroundContainer.getBoundingClientRect().height + 26}px - 4rem)`;
                        const width = window.localStorage.getItem('dragbar-x');
                        exampleContainer.style.width = `calc(100% - ${width}px - 4rem)`;
                    }
                }
            };
        });
        const runButton = document.getElementById('run-button');
        runButton.onclick = () => {
            const run = sandbox.getRunnableJS();
            const runPlugin = plugins.find(p => p.id === 'logs');
            createElements_1.activatePlugin(runPlugin, currentPlugin(), sandbox, tabBar, container);
            runtime_1.runWithCustomLogs(run);
        };
        // Handle the close buttons on the examples
        document.querySelectorAll('button.examples-close').forEach(b => {
            const button = b;
            button.onclick = (e) => {
                var _a;
                const button = e.target;
                const navLI = button.closest('li');
                (_a = navLI) === null || _a === void 0 ? void 0 : _a.classList.remove('open');
            };
        });
        createElements_1.setupSidebarToggle();
        createConfigDropdown_1.createConfigDropdown(sandbox, monaco);
        createConfigDropdown_1.updateConfigDropdownForCompilerOptions(sandbox, monaco);
        // Support grabbing examples from the location hash
        if (location.hash.startsWith('#example')) {
            const exampleName = location.hash.replace('#example/', '').trim();
            sandbox.config.logger.log('Loading example:', exampleName);
            getExample_1.getExampleSourceCode(config.prefix, config.lang, exampleName).then(ex => {
                if (ex.example && ex.code) {
                    const { example, code } = ex;
                    // Update the localstorage showing that you've seen this page
                    if (localStorage) {
                        const seenText = localStorage.getItem('examples-seen') || '{}';
                        const seen = JSON.parse(seenText);
                        seen[example.id] = example.hash;
                        localStorage.setItem('examples-seen', JSON.stringify(seen));
                    }
                    // Set the menu to be the same section as this current example
                    // this happens behind the scene and isn't visible till you hover
                    // const sectionTitle = example.path[0]
                    // const allSectionTitles = document.getElementsByClassName('section-name')
                    // for (const title of allSectionTitles) {
                    //   if (title.textContent === sectionTitle) {
                    //     title.onclick({})
                    //   }
                    // }
                    const allLinks = document.querySelectorAll('example-link');
                    // @ts-ignore
                    for (const link of allLinks) {
                        if (link.textContent === example.title) {
                            link.classList.add('highlight');
                        }
                    }
                    document.title = 'TypeScript Playground - ' + example.title;
                    sandbox.setText(code);
                }
                else {
                    sandbox.setText('// There was an issue getting the example, bad URL? Check the console in the developer tools');
                }
            });
        }
        // Sets up a way to click between examples
        monaco.languages.registerLinkProvider(sandbox.language, new ExampleHighlight_1.ExampleHighlighter());
        const languageSelector = document.getElementById('language-selector');
        const params = new URLSearchParams(location.search);
        languageSelector.options.selectedIndex = params.get('useJavaScript') ? 1 : 0;
        languageSelector.onchange = () => {
            const useJavaScript = languageSelector.value === 'JavaScript';
            const query = sandbox.getURLQueryWithCompilerOptions(sandbox, { useJavaScript: useJavaScript ? true : undefined });
            const fullURL = `${document.location.protocol}//${document.location.host}${document.location.pathname}${query}`;
            // @ts-ignore
            document.location = fullURL;
        };
        const ui = createUI_1.createUI();
        const exporter = exporter_1.createExporter(sandbox, monaco, ui);
        const playground = {
            exporter,
            ui,
            registerPlugin,
        };
        window.ts = sandbox.ts;
        window.sandbox = sandbox;
        window.playground = playground;
        console.log(`Using TypeScript ${window.ts.version}`);
        console.log('Available globals:');
        console.log('\twindow.ts', window.ts);
        console.log('\twindow.sandbox', window.sandbox);
        console.log('\twindow.playground', window.playground);
        // Dev mode plugin
        if (options_1.allowConnectingToLocalhost()) {
            window.exports = {};
            console.log('Connecting to dev plugin');
            try {
                // @ts-ignore
                const re = window.require;
                re(['local/index'], (devPlugin) => {
                    console.log('Set up dev plugin from localhost:5000');
                    console.log(devPlugin);
                    playground.registerPlugin(devPlugin);
                    // Auto-select the dev plugin
                    createElements_1.activatePlugin(devPlugin, currentPlugin(), sandbox, tabBar, container);
                });
            }
            catch (error) {
                console.error('Problem loading up the dev plugin');
                console.error(error);
            }
        }
        options_1.activePlugins().forEach(plugin => {
            try {
                // @ts-ignore
                const re = window.require;
                re([`unpkg/${plugin.module}@latest/dist/index`], (devPlugin) => {
                    playground.registerPlugin(devPlugin);
                    // Auto-select the dev plugin
                    if (devPlugin.shouldBeSelected && devPlugin.shouldBeSelected()) {
                        createElements_1.activatePlugin(devPlugin, currentPlugin(), sandbox, tabBar, container);
                    }
                });
            }
            catch (error) {
                console.error('Problem loading up the plugin:', plugin);
                console.error(error);
            }
        });
        return playground;
    };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9wbGF5Z3JvdW5kL3NyYy9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7SUFvREEsTUFBTSxzQkFBc0IsR0FBK0I7UUFDekQseUJBQWdCO1FBQ2hCLHVCQUFhO1FBQ2IsdUJBQVU7UUFDVixtQkFBUztRQUNULHVCQUFhO0tBQ2QsQ0FBQTtJQUVZLFFBQUEsZUFBZSxHQUFHLENBQUMsT0FBZ0IsRUFBRSxNQUFjLEVBQUUsTUFBd0IsRUFBRSxFQUFFO1FBQzVGLE1BQU0sZ0JBQWdCLEdBQUcsT0FBTyxDQUFDLFVBQVUsRUFBRSxDQUFDLGFBQWMsQ0FBQyxhQUFjLENBQUMsYUFBYyxDQUFBO1FBQzFGLE1BQU0sT0FBTyxHQUFHLDhCQUFhLEVBQUUsQ0FBQTtRQUMvQixnQkFBZ0IsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUE7UUFFckMsTUFBTSxPQUFPLEdBQUcsOEJBQWEsRUFBRSxDQUFBO1FBQy9CLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUVyQyxNQUFNLE1BQU0sR0FBRyw2QkFBWSxFQUFFLENBQUE7UUFDN0IsT0FBTyxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUUzQixNQUFNLFNBQVMsR0FBRyxzQ0FBcUIsRUFBRSxDQUFBO1FBQ3pDLE9BQU8sQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUE7UUFFOUIsTUFBTSxPQUFPLEdBQUcsRUFBd0IsQ0FBQTtRQUN4QyxNQUFNLElBQUksR0FBRyxFQUF5QixDQUFBO1FBRXRDLE1BQU0sY0FBYyxHQUFHLENBQUMsTUFBd0IsRUFBRSxFQUFFO1lBQ2xELE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7WUFFcEIsTUFBTSxHQUFHLEdBQUcsbUNBQWtCLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDdEMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENB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SUFBSSxTQUFTLENBQUMsZ0JBQWdCLElBQUksU0FBUyxDQUFDLGdCQUFnQixFQUFFLEVBQUU7d0JBQzlELCtCQUFjLENBQUMsU0FBUyxFQUFFLGFBQWEsRUFBRSxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUE7cUJBQ3ZFO2dCQUNILENBQUMsQ0FBQyxDQUFBO2FBQ0g7WUFBQyxPQUFPLEtBQUssRUFBRTtnQkFDZCxPQUFPLENBQUMsS0FBSyxDQUFDLGdDQUFnQyxFQUFFLE1BQU0sQ0FBQyxDQUFBO2dCQUN2RCxPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFBO2FBQ3JCO1FBQ0gsQ0FBQyxDQUFDLENBQUE7UUFFRixPQUFPLFVBQVUsQ0FBQTtJQUNuQixDQUFDLENBQUEiLCJzb3VyY2VzQ29udGVudCI6WyJ0eXBlIFNhbmRib3ggPSBSZXR1cm5UeXBlPHR5cGVvZiBpbXBvcnQoJ3R5cGVzY3JpcHQtc2FuZGJveCcpLmNyZWF0ZVR5cGVTY3JpcHRTYW5kYm94PlxudHlwZSBNb25hY28gPSB0eXBlb2YgaW1wb3J0KCdtb25hY28tZWRpdG9yJylcblxuZGVjbGFyZSBjb25zdCB3aW5kb3c6IGFueVxuXG5pbXBvcnQgeyBjb21waWxlZEpTUGx1Z2luIH0gZnJvbSAnLi9zaWRlYmFyL3Nob3dKUydcbmltcG9ydCB7XG4gIGNyZWF0ZVNpZGViYXIsXG4gIGNyZWF0ZVRhYkZvclBsdWdpbixcbiAgY3JlYXRlVGFiQmFyLFxuICBjcmVhdGVQbHVnaW5Db250YWluZXIsXG4gIGFjdGl2YXRlUGx1Z2luLFxuICBjcmVhdGVEcmFnQmFyLFxuICBzZXR1cFNpZGViYXJUb2dnbGUsXG59IGZyb20gJy4vY3JlYXRlRWxlbWVudHMnXG5pbXBvcnQgeyBzaG93RFRTUGx1Z2luIH0gZnJvbSAnLi9zaWRlYmFyL3Nob3dEVFMnXG5pbXBvcnQgeyBydW5XaXRoQ3VzdG9tTG9ncywgcnVuUGx1Z2luIH0gZnJvbSAnLi9zaWRlYmFyL3J1bnRpbWUnXG5pbXBvcnQgeyBjcmVhdGVFeHBvcnRlciB9IGZyb20gJy4vZXhwb3J0ZXInXG5pbXBvcnQgeyBjcmVhdGVVSSB9IGZyb20gJy4vY3JlYXRlVUknXG5pbXBvcnQgeyBnZXRFeGFtcGxlU291cmNlQ29kZSB9IGZyb20gJy4vZ2V0RXhhbXBsZSdcbmltcG9ydCB7IEV4YW1wbGVIaWdobGlnaHRlciB9IGZyb20gJy4vbW9uYWNvL0V4YW1wbGVIaWdobGlnaHQnXG5pbXBvcnQgeyBjcmVhdGVDb25maWdEcm9wZG93biwgdXBkYXRlQ29uZmlnRHJvcGRvd25Gb3JDb21waWxlck9wdGlvbnMgfSBmcm9tICcuL2NyZWF0ZUNvbmZpZ0Ryb3Bkb3duJ1xuaW1wb3J0IHsgc2hvd0Vycm9ycyB9IGZyb20gJy4vc2lkZWJhci9zaG93RXJyb3JzJ1xuaW1wb3J0IHsgb3B0aW9uc1BsdWdpbiwgYWxsb3dDb25uZWN0aW5nVG9Mb2NhbGhvc3QsIGFjdGl2ZVBsdWdpbnMgfSBmcm9tICcuL3NpZGViYXIvb3B0aW9ucydcblxuLyoqIFRoZSBpbnRlcmZhY2Ugb2YgYWxsIHNpZGViYXIgcGx1Z2lucyAqL1xuZXhwb3J0IGludGVyZmFjZSBQbGF5Z3JvdW5kUGx1Z2luIHtcbiAgLyoqIE5vdCBwdWJsaWMgZmFjaW5nLCBidXQgdXNlZCBieSB0aGUgcGxheWdyb3VuZCB0byB1bmlxdWVseSBpZGVudGlmeSBwbHVnaW5zICovXG4gIGlkOiBzdHJpbmdcbiAgLyoqIFRvIHNob3cgaW4gdGhlIHRhYnMgKi9cbiAgZGlzcGxheU5hbWU6IHN0cmluZ1xuICAvKiogU2hvdWxkIHRoaXMgcGx1Z2luIGJlIHNlbGVjdGVkIHdoZW4gdGhlIHBsdWdpbiBpcyBmaXJzdCBsb2FkZWQ/IExldCdzIHlvdSBjaGVjayBmb3IgcXVlcnkgdmFycyBldGMgdG8gbG9hZCBhIHBhcnRpY3VsYXIgcGx1Z2luICovXG4gIHNob3VsZEJlU2VsZWN0ZWQ/OiAoKSA9PiBib29sZWFuXG4gIC8qKiBCZWZvcmUgd2Ugc2hvdyB0aGUgdGFiLCB1c2UgdGhpcyB0byBzZXQgdXAgeW91ciBIVE1MIC0gaXQgd2lsbCBhbGwgYmUgcmVtb3ZlZCBieSB0aGUgcGxheWdyb3VuZCB3aGVuIHNvbWVvbmUgbmF2aWdhdGVzIG9mZiB0aGUgdGFiICovXG4gIHdpbGxNb3VudD86IChzYW5kYm94OiBTYW5kYm94LCBjb250YWluZXI6IEhUTUxEaXZFbGVtZW50KSA9PiB2b2lkXG4gIC8qKiBBZnRlciB3ZSBzaG93IHRoZSB0YWIgKi9cbiAgZGlkTW91bnQ/OiAoc2FuZGJveDogU2FuZGJveCwgY29udGFpbmVyOiBIVE1MRGl2RWxlbWVudCkgPT4gdm9pZFxuICAvKiogTW9kZWwgY2hhbmdlcyB3aGlsZSB0aGlzIHBsdWdpbiBpcyBhY3RpdmVseSBzZWxlY3RlZCAgKi9cbiAgbW9kZWxDaGFuZ2VkPzogKHNhbmRib3g6IFNhbmRib3gsIG1vZGVsOiBpbXBvcnQoJ21vbmFjby1lZGl0b3InKS5lZGl0b3IuSVRleHRNb2RlbCkgPT4gdm9pZFxuICAvKiogRGVsYXllZCBtb2RlbCBjaGFuZ2VzIHdoaWxlIHRoaXMgcGx1Z2luIGlzIGFjdGl2ZWx5IHNlbGVjdGVkLCB1c2VmdWwgd2hlbiB5b3UgYXJlIHdvcmtpbmcgd2l0aCB0aGUgVFMgQVBJIGJlY2F1c2UgaXQgd29uJ3QgcnVuIG9uIGV2ZXJ5IGtleXByZXNzICovXG4gIG1vZGVsQ2hhbmdlZERlYm91bmNlPzogKHNhbmRib3g6IFNhbmRib3gsIG1vZGVsOiBpbXBvcnQoJ21vbmFjby1lZGl0b3InKS5lZGl0b3IuSVRleHRNb2RlbCkgPT4gdm9pZFxuICAvKiogQmVmb3JlIHdlIHJlbW92ZSB0aGUgdGFiICovXG4gIHdpbGxVbm1vdW50PzogKHNhbmRib3g6IFNhbmRib3gsIGNvbnRhaW5lcjogSFRNTERpdkVsZW1lbnQpID0+IHZvaWRcbiAgLyoqIEFmdGVyIHdlIHJlbW92ZSB0aGUgdGFiICovXG4gIGRpZFVubW91bnQ/OiAoc2FuZGJveDogU2FuZGJveCwgY29udGFpbmVyOiBIVE1MRGl2RWxlbWVudCkgPT4gdm9pZFxufVxuXG5pbnRlcmZhY2UgUGxheWdyb3VuZENvbmZpZyB7XG4gIGxhbmc6IHN0cmluZ1xuICBwcmVmaXg6IHN0cmluZ1xufVxuXG5jb25zdCBkZWZhdWx0UGx1Z2luRmFjdG9yaWVzOiAoKCkgPT4gUGxheWdyb3VuZFBsdWdpbilbXSA9IFtcbiAgY29tcGlsZWRKU1BsdWdpbixcbiAgc2hvd0RUU1BsdWdpbixcbiAgc2hvd0Vycm9ycyxcbiAgcnVuUGx1Z2luLFxuICBvcHRpb25zUGx1Z2luLFxuXVxuXG5leHBvcnQgY29uc3Qgc2V0dXBQbGF5Z3JvdW5kID0gKHNhbmRib3g6IFNhbmRib3gsIG1vbmFjbzogTW9uYWNvLCBjb25maWc6IFBsYXlncm91bmRDb25maWcpID0+IHtcbiAgY29uc3QgcGxheWdyb3VuZFBhcmVudCA9IHNhbmRib3guZ2V0RG9tTm9kZSgpLnBhcmVudEVsZW1lbnQhLnBhcmVudEVsZW1lbnQhLnBhcmVudEVsZW1lbnQhXG4gIGNvbnN0IGRyYWdCYXIgPSBjcmVhdGVEcmFnQmFyKClcbiAgcGxheWdyb3VuZFBhcmVudC5hcHBlbmRDaGlsZChkcmFnQmFyKVxuXG4gIGNvbnN0IHNpZGViYXIgPSBjcmVhdGVTaWRlYmFyKClcbiAgcGxheWdyb3VuZFBhcmVudC5hcHBlbmRDaGlsZChzaWRlYmFyKVxuXG4gIGNvbnN0IHRhYkJhciA9IGNyZWF0ZVRhYkJhcigpXG4gIHNpZGViYXIuYXBwZW5kQ2hpbGQodGFiQmFyKVxuXG4gIGNvbnN0IGNvbnRhaW5lciA9IGNyZWF0ZVBsdWdpbkNvbnRhaW5lcigpXG4gIHNpZGViYXIuYXBwZW5kQ2hpbGQoY29udGFpbmVyKVxuXG4gIGNvbnN0IHBsdWdpbnMgPSBbXSBhcyBQbGF5Z3JvdW5kUGx1Z2luW11cbiAgY29uc3QgdGFicyA9IFtdIGFzIEhUTUxCdXR0b25FbGVtZW50W11cblxuICBjb25zdCByZWdpc3RlclBsdWdpbiA9IChwbHVnaW46IFBsYXlncm91bmRQbHVnaW4pID0+IHtcbiAgICBwbHVnaW5zLnB1c2gocGx1Z2luKVxuXG4gICAgY29uc3QgdGFiID0gY3JlYXRlVGFiRm9yUGx1Z2luKHBsdWdpbilcbiAgICB0YWJzLnB1c2godGFiKVxuXG4gICAgY29uc3QgdGFiQ2xpY2tlZDogSFRNTEVsZW1lbnRbJ29uY2xpY2snXSA9IGUgPT4ge1xuICAgICAgY29uc3QgcHJldmlvdXNQbHVnaW4gPSBjdXJyZW50UGx1Z2luKClcbiAgICAgIGNvbnN0IG5ld1RhYiA9IGUudGFyZ2V0IGFzIEhUTUxFbGVtZW50XG4gICAgICBjb25zdCBuZXdQbHVnaW4gPSBwbHVnaW5zLmZpbmQocCA9PiBwLmRpc3BsYXlOYW1lID09IG5ld1RhYi50ZXh0Q29udGVudCkhXG4gICAgICBhY3RpdmF0ZVBsdWdpbihuZXdQbHVnaW4sIHByZXZpb3VzUGx1Z2luLCBzYW5kYm94LCB0YWJCYXIsIGNvbnRhaW5lcilcbiAgICB9XG5cbiAgICB0YWJCYXIuYXBwZW5kQ2hpbGQodGFiKVxuICAgIHRhYi5vbmNsaWNrID0gdGFiQ2xpY2tlZFxuICB9XG5cbiAgY29uc3QgY3VycmVudFBsdWdpbiA9ICgpID0+IHtcbiAgICBjb25zdCBzZWxlY3RlZFRhYiA9IHRhYnMuZmluZCh0ID0+IHQuY2xhc3NMaXN0LmNvbnRhaW5zKCdhY3RpdmUnKSkhXG4gICAgcmV0dXJuIHBsdWdpbnNbdGFicy5pbmRleE9mKHNlbGVjdGVkVGFiKV1cbiAgfVxuXG4gIGNvbnN0IGluaXRpYWxQbHVnaW5zID0gZGVmYXVsdFBsdWdpbkZhY3Rvcmllcy5tYXAoZiA9PiBmKCkpXG4gIGluaXRpYWxQbHVnaW5zLmZvckVhY2gocCA9PiByZWdpc3RlclBsdWdpbihwKSlcblxuICAvLyBDaG9vc2Ugd2hpY2ggc2hvdWxkIGJlIHNlbGVjdGVkXG4gIGNvbnN0IHByaW9yaXR5UGx1Z2luID0gcGx1Z2lucy5maW5kKHBsdWdpbiA9PiBwbHVnaW4uc2hvdWxkQmVTZWxlY3RlZCAmJiBwbHVnaW4uc2hvdWxkQmVTZWxlY3RlZCgpKVxuICBjb25zdCBzZWxlY3RlZFBsdWdpbiA9IHByaW9yaXR5UGx1Z2luIHx8IHBsdWdpbnNbMF1cbiAgY29uc3Qgc2VsZWN0ZWRUYWIgPSB0YWJzW3BsdWdpbnMuaW5kZXhPZihzZWxlY3RlZFBsdWdpbildIVxuICBzZWxlY3RlZFRhYi5vbmNsaWNrISh7IHRhcmdldDogc2VsZWN0ZWRUYWIgfSBhcyBhbnkpXG5cbiAgbGV0IGRlYm91bmNpbmdUaW1lciA9IGZhbHNlXG4gIHNhbmRib3guZWRpdG9yLm9uRGlkQ2hhbmdlTW9kZWxDb250ZW50KF9ldmVudCA9PiB7XG4gICAgY29uc3QgcGx1Z2luID0gY3VycmVudFBsdWdpbigpXG4gICAgaWYgKHBsdWdpbi5tb2RlbENoYW5nZWQpIHBsdWdpbi5tb2RlbENoYW5nZWQoc2FuZGJveCwgc2FuZGJveC5nZXRNb2RlbCgpKVxuXG4gICAgLy8gVGhpcyBuZWVkcyB0byBiZSBsYXN0IGluIHRoZSBmdW5jdGlvblxuICAgIGlmIChkZWJvdW5jaW5nVGltZXIpIHJldHVyblxuICAgIGRlYm91bmNpbmdUaW1lciA9IHRydWVcbiAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIGRlYm91bmNpbmdUaW1lciA9IGZhbHNlXG4gICAgICBwbGF5Z3JvdW5kRGVib3VuY2VkTWFpbkZ1bmN0aW9uKClcblxuICAgICAgLy8gT25seSBjYWxsIHRoZSBwbHVnaW4gZnVuY3Rpb24gb25jZSBldmVyeSAwLjNzXG4gICAgICBpZiAocGx1Z2luLm1vZGVsQ2hhbmdlZERlYm91bmNlICYmIHBsdWdpbi5kaXNwbGF5TmFtZSA9PT0gY3VycmVudFBsdWdpbigpLmRpc3BsYXlOYW1lKSB7XG4gICAgICAgIHBsdWdpbi5tb2RlbENoYW5nZWREZWJvdW5jZShzYW5kYm94LCBzYW5kYm94LmdldE1vZGVsKCkpXG4gICAgICB9XG4gICAgfSwgMzAwKVxuICB9KVxuXG4gIC8vIFNldHMgdGhlIFVSTCBhbmQgc3RvcmFnZSBvZiB0aGUgc2FuZGJveCBzdHJpbmdcbiAgY29uc3QgcGxheWdyb3VuZERlYm91bmNlZE1haW5GdW5jdGlvbiA9ICgpID0+IHtcbiAgICBjb25zdCBhbHdheXNVcGRhdGVVUkwgPSAhbG9jYWxTdG9yYWdlLmdldEl0ZW0oJ2Rpc2FibGUtc2F2ZS1vbi10eXBlJylcbiAgICBpZiAoYWx3YXlzVXBkYXRlVVJMKSB7XG4gICAgICBjb25zdCBuZXdVUkwgPSBzYW5kYm94LmdldFVSTFF1ZXJ5V2l0aENvbXBpbGVyT3B0aW9ucyhzYW5kYm94KVxuICAgICAgd2luZG93Lmhpc3RvcnkucmVwbGFjZVN0YXRlKHt9LCAnJywgbmV3VVJMKVxuICAgIH1cblxuICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKCdzYW5kYm94LWhpc3RvcnknLCBzYW5kYm94LmdldFRleHQoKSlcbiAgfVxuXG4gIC8vIFdoZW4gYW55IGNvbXBpbGVyIGZsYWdzIGFyZSBjaGFuZ2VkLCB0cmlnZ2VyIGEgcG90ZW50aWFsIGNoYW5nZSB0byB0aGUgVVJMXG4gIHNhbmRib3guc2V0RGlkVXBkYXRlQ29tcGlsZXJTZXR0aW5ncygoKSA9PiB7XG4gICAgcGxheWdyb3VuZERlYm91bmNlZE1haW5GdW5jdGlvbigpXG5cbiAgICBjb25zdCBtb2RlbCA9IHNhbmRib3guZWRpdG9yLmdldE1vZGVsKClcbiAgICBjb25zdCBwbHVnaW4gPSBjdXJyZW50UGx1Z2luKClcbiAgICBpZiAobW9kZWwgJiYgcGx1Z2luLm1vZGVsQ2hhbmdlZCkgcGx1Z2luLm1vZGVsQ2hhbmdlZChzYW5kYm94LCBtb2RlbClcbiAgICBpZiAobW9kZWwgJiYgcGx1Z2luLm1vZGVsQ2hhbmdlZERlYm91bmNlKSBwbHVnaW4ubW9kZWxDaGFuZ2VkRGVib3VuY2Uoc2FuZGJveCwgbW9kZWwpXG4gIH0pXG5cbiAgLy8gU2V0dXAgd29ya2luZyB3aXRoIHRoZSBleGlzdGluZyBVSSwgb25jZSBpdCdzIGxvYWRlZFxuXG4gIC8vIFZlcnNpb25zIG9mIFR5cGVTY3JpcHRcblxuICAvLyBTZXQgdXAgdGhlIGxhYmVsIGZvciB0aGUgZHJvcGRvd25cbiAgZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnI3ZlcnNpb25zID4gYScpLml0ZW0oMCkuaW5uZXJIVE1MID0gJ3YnICsgc2FuZGJveC50cy52ZXJzaW9uICsgXCIgPHNwYW4gY2xhc3M9J2NhcmV0Jy8+XCJcblxuICAvLyBBZGQgdGhlIHZlcnNpb25zIHRvIHRoZSBkcm9wZG93blxuICBjb25zdCB2ZXJzaW9uc01lbnUgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcjdmVyc2lvbnMgPiB1bCcpLml0ZW0oMClcbiAgY29uc3QgYWxsVmVyc2lvbnMgPSBbXCIzLjguMC1iZXRhXCIsIC4uLnNhbmRib3guc3VwcG9ydGVkVmVyc2lvbnNdXG4gIGFsbFZlcnNpb25zLmZvckVhY2goKHY6IHN0cmluZykgPT4ge1xuICAgIGNvbnN0IGxpID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGknKVxuICAgIGNvbnN0IGEgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJylcbiAgICBhLnRleHRDb250ZW50ID0gdlxuICAgIGEuaHJlZiA9ICcjJ1xuXG4gICAgbGkub25jbGljayA9ICgpID0+IHtcbiAgICAgIGNvbnN0IGN1cnJlbnRVUkwgPSBzYW5kYm94LmdldFVSTFF1ZXJ5V2l0aENvbXBpbGVyT3B0aW9ucyhzYW5kYm94KVxuICAgICAgY29uc3QgcGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcyhjdXJyZW50VVJMLnNwbGl0KCcjJylbMF0pXG4gICAgICBwYXJhbXMuc2V0KCd0cycsIHYpXG4gICAgICBjb25zdCBoYXNoID0gZG9jdW1lbnQubG9jYXRpb24uaGFzaC5sZW5ndGggPyBkb2N1bWVudC5sb2NhdGlvbi5oYXNoIDogJydcbiAgICAgIGNvbnN0IG5ld1VSTCA9IGAke2RvY3VtZW50LmxvY2F0aW9uLnByb3RvY29sfS8vJHtkb2N1bWVudC5sb2NhdGlvbi5ob3N0fSR7ZG9jdW1lbnQubG9jYXRpb24ucGF0aG5hbWV9PyR7cGFyYW1zfSR7aGFzaH1gXG5cbiAgICAgIC8vIEB0cy1pZ25vcmUgLSBpdCBpcyBhbGxvd2VkXG4gICAgICBkb2N1bWVudC5sb2NhdGlvbiA9IG5ld1VSTFxuICAgIH1cblxuICAgIGxpLmFwcGVuZENoaWxkKGEpXG4gICAgdmVyc2lvbnNNZW51LmFwcGVuZENoaWxkKGxpKVxuICB9KVxuXG4gIC8vIFN1cHBvcnQgZHJvcGRvd25zXG4gIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5uYXZiYXItc3ViIGxpLmRyb3Bkb3duID4gYScpLmZvckVhY2gobGluayA9PiB7XG4gICAgY29uc3QgYSA9IGxpbmsgYXMgSFRNTEFuY2hvckVsZW1lbnRcbiAgICBhLm9uY2xpY2sgPSBfZSA9PiB7XG4gICAgICBpZiAoYS5wYXJlbnRFbGVtZW50IS5jbGFzc0xpc3QuY29udGFpbnMoJ29wZW4nKSkge1xuICAgICAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcubmF2YmFyLXN1YiBsaS5vcGVuJykuZm9yRWFjaChpID0+IGkuY2xhc3NMaXN0LnJlbW92ZSgnb3BlbicpKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLm5hdmJhci1zdWIgbGkub3BlbicpLmZvckVhY2goaSA9PiBpLmNsYXNzTGlzdC5yZW1vdmUoJ29wZW4nKSlcbiAgICAgICAgYS5wYXJlbnRFbGVtZW50IS5jbGFzc0xpc3QudG9nZ2xlKCdvcGVuJylcblxuICAgICAgICBjb25zdCBleGFtcGxlQ29udGFpbmVyID0gYVxuICAgICAgICAgIC5jbG9zZXN0KCdsaScpIVxuICAgICAgICAgIC5nZXRFbGVtZW50c0J5VGFnTmFtZSgndWwnKVxuICAgICAgICAgIC5pdGVtKDApIVxuXG4gICAgICAgIC8vIFNFdCBleGFjdCBoZWlnaHQgYW5kIHdpZHRocyBmb3IgdGhlIHBvcG92ZXJzIGZvciB0aGUgbWFpbiBwbGF5Z3JvdW5kIG5hdmlnYXRpb25cbiAgICAgICAgY29uc3QgaXNQbGF5Z3JvdW5kU3VibWVudSA9ICEhYS5jbG9zZXN0KCduYXYnKVxuICAgICAgICBpZiAoaXNQbGF5Z3JvdW5kU3VibWVudSkge1xuICAgICAgICAgIGNvbnN0IHBsYXlncm91bmRDb250YWluZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncGxheWdyb3VuZC1jb250YWluZXInKSFcbiAgICAgICAgICBleGFtcGxlQ29udGFpbmVyLnN0eWxlLmhlaWdodCA9IGBjYWxjKCR7cGxheWdyb3VuZENvbnRhaW5lci5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS5oZWlnaHQgKyAyNn1weCAtIDRyZW0pYFxuXG4gICAgICAgICAgY29uc3Qgd2lkdGggPSB3aW5kb3cubG9jYWxTdG9yYWdlLmdldEl0ZW0oJ2RyYWdiYXIteCcpXG4gICAgICAgICAgZXhhbXBsZUNvbnRhaW5lci5zdHlsZS53aWR0aCA9IGBjYWxjKDEwMCUgLSAke3dpZHRofXB4IC0gNHJlbSlgXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH0pXG5cbiAgY29uc3QgcnVuQnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3J1bi1idXR0b24nKSFcbiAgcnVuQnV0dG9uLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgY29uc3QgcnVuID0gc2FuZGJveC5nZXRSdW5uYWJsZUpTKClcbiAgICBjb25zdCBydW5QbHVnaW4gPSBwbHVnaW5zLmZpbmQocCA9PiBwLmlkID09PSAnbG9ncycpIVxuICAgIGFjdGl2YXRlUGx1Z2luKHJ1blBsdWdpbiwgY3VycmVudFBsdWdpbigpLCBzYW5kYm94LCB0YWJCYXIsIGNvbnRhaW5lcilcbiAgICBydW5XaXRoQ3VzdG9tTG9ncyhydW4pXG4gIH1cblxuICAvLyBIYW5kbGUgdGhlIGNsb3NlIGJ1dHRvbnMgb24gdGhlIGV4YW1wbGVzXG4gIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ2J1dHRvbi5leGFtcGxlcy1jbG9zZScpLmZvckVhY2goYiA9PiB7XG4gICAgY29uc3QgYnV0dG9uID0gYiBhcyBIVE1MQnV0dG9uRWxlbWVudFxuICAgIGJ1dHRvbi5vbmNsaWNrID0gKGU6IGFueSkgPT4ge1xuICAgICAgY29uc3QgYnV0dG9uID0gZS50YXJnZXQgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcbiAgICAgIGNvbnN0IG5hdkxJID0gYnV0dG9uLmNsb3Nlc3QoJ2xpJylcbiAgICAgIG5hdkxJPy5jbGFzc0xpc3QucmVtb3ZlKCdvcGVuJylcbiAgICB9XG4gIH0pXG5cbiAgc2V0dXBTaWRlYmFyVG9nZ2xlKClcblxuICBjcmVhdGVDb25maWdEcm9wZG93bihzYW5kYm94LCBtb25hY28pXG4gIHVwZGF0ZUNvbmZpZ0Ryb3Bkb3duRm9yQ29tcGlsZXJPcHRpb25zKHNhbmRib3gsIG1vbmFjbylcblxuICAvLyBTdXBwb3J0IGdyYWJiaW5nIGV4YW1wbGVzIGZyb20gdGhlIGxvY2F0aW9uIGhhc2hcbiAgaWYgKGxvY2F0aW9uLmhhc2guc3RhcnRzV2l0aCgnI2V4YW1wbGUnKSkge1xuICAgIGNvbnN0IGV4YW1wbGVOYW1lID0gbG9jYXRpb24uaGFzaC5yZXBsYWNlKCcjZXhhbXBsZS8nLCAnJykudHJpbSgpXG4gICAgc2FuZGJveC5jb25maWcubG9nZ2VyLmxvZygnTG9hZGluZyBleGFtcGxlOicsIGV4YW1wbGVOYW1lKVxuICAgIGdldEV4YW1wbGVTb3VyY2VDb2RlKGNvbmZpZy5wcmVmaXgsIGNvbmZpZy5sYW5nLCBleGFtcGxlTmFtZSkudGhlbihleCA9PiB7XG4gICAgICBpZiAoZXguZXhhbXBsZSAmJiBleC5jb2RlKSB7XG4gICAgICAgIGNvbnN0IHsgZXhhbXBsZSwgY29kZSB9ID0gZXhcblxuICAgICAgICAvLyBVcGRhdGUgdGhlIGxvY2Fsc3RvcmFnZSBzaG93aW5nIHRoYXQgeW91J3ZlIHNlZW4gdGhpcyBwYWdlXG4gICAgICAgIGlmIChsb2NhbFN0b3JhZ2UpIHtcbiAgICAgICAgICBjb25zdCBzZWVuVGV4dCA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKCdleGFtcGxlcy1zZWVuJykgfHwgJ3t9J1xuICAgICAgICAgIGNvbnN0IHNlZW4gPSBKU09OLnBhcnNlKHNlZW5UZXh0KVxuICAgICAgICAgIHNlZW5bZXhhbXBsZS5pZF0gPSBleGFtcGxlLmhhc2hcbiAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnZXhhbXBsZXMtc2VlbicsIEpTT04uc3RyaW5naWZ5KHNlZW4pKVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2V0IHRoZSBtZW51IHRvIGJlIHRoZSBzYW1lIHNlY3Rpb24gYXMgdGhpcyBjdXJyZW50IGV4YW1wbGVcbiAgICAgICAgLy8gdGhpcyBoYXBwZW5zIGJlaGluZCB0aGUgc2NlbmUgYW5kIGlzbid0IHZpc2libGUgdGlsbCB5b3UgaG92ZXJcbiAgICAgICAgLy8gY29uc3Qgc2VjdGlvblRpdGxlID0gZXhhbXBsZS5wYXRoWzBdXG4gICAgICAgIC8vIGNvbnN0IGFsbFNlY3Rpb25UaXRsZXMgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCdzZWN0aW9uLW5hbWUnKVxuICAgICAgICAvLyBmb3IgKGNvbnN0IHRpdGxlIG9mIGFsbFNlY3Rpb25UaXRsZXMpIHtcbiAgICAgICAgLy8gICBpZiAodGl0bGUudGV4dENvbnRlbnQgPT09IHNlY3Rpb25UaXRsZSkge1xuICAgICAgICAvLyAgICAgdGl0bGUub25jbGljayh7fSlcbiAgICAgICAgLy8gICB9XG4gICAgICAgIC8vIH1cblxuICAgICAgICBjb25zdCBhbGxMaW5rcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ2V4YW1wbGUtbGluaycpXG4gICAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgICAgZm9yIChjb25zdCBsaW5rIG9mIGFsbExpbmtzKSB7XG4gICAgICAgICAgaWYgKGxpbmsudGV4dENvbnRlbnQgPT09IGV4YW1wbGUudGl0bGUpIHtcbiAgICAgICAgICAgIGxpbmsuY2xhc3NMaXN0LmFkZCgnaGlnaGxpZ2h0JylcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBkb2N1bWVudC50aXRsZSA9ICdUeXBlU2NyaXB0IFBsYXlncm91bmQgLSAnICsgZXhhbXBsZS50aXRsZVxuICAgICAgICBzYW5kYm94LnNldFRleHQoY29kZSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNhbmRib3guc2V0VGV4dCgnLy8gVGhlcmUgd2FzIGFuIGlzc3VlIGdldHRpbmcgdGhlIGV4YW1wbGUsIGJhZCBVUkw/IENoZWNrIHRoZSBjb25zb2xlIGluIHRoZSBkZXZlbG9wZXIgdG9vbHMnKVxuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICAvLyBTZXRzIHVwIGEgd2F5IHRvIGNsaWNrIGJldHdlZW4gZXhhbXBsZXNcbiAgbW9uYWNvLmxhbmd1YWdlcy5yZWdpc3RlckxpbmtQcm92aWRlcihzYW5kYm94Lmxhbmd1YWdlLCBuZXcgRXhhbXBsZUhpZ2hsaWdodGVyKCkpXG5cbiAgY29uc3QgbGFuZ3VhZ2VTZWxlY3RvciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdsYW5ndWFnZS1zZWxlY3RvcicpISBhcyBIVE1MU2VsZWN0RWxlbWVudFxuICBjb25zdCBwYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKGxvY2F0aW9uLnNlYXJjaClcbiAgbGFuZ3VhZ2VTZWxlY3Rvci5vcHRpb25zLnNlbGVjdGVkSW5kZXggPSBwYXJhbXMuZ2V0KCd1c2VKYXZhU2NyaXB0JykgPyAxIDogMFxuXG4gIGxhbmd1YWdlU2VsZWN0b3Iub25jaGFuZ2UgPSAoKSA9PiB7XG4gICAgY29uc3QgdXNlSmF2YVNjcmlwdCA9IGxhbmd1YWdlU2VsZWN0b3IudmFsdWUgPT09ICdKYXZhU2NyaXB0J1xuICAgIGNvbnN0IHF1ZXJ5ID0gc2FuZGJveC5nZXRVUkxRdWVyeVdpdGhDb21waWxlck9wdGlvbnMoc2FuZGJveCwgeyB1c2VKYXZhU2NyaXB0OiB1c2VKYXZhU2NyaXB0ID8gdHJ1ZSA6IHVuZGVmaW5lZCB9KVxuICAgIGNvbnN0IGZ1bGxVUkwgPSBgJHtkb2N1bWVudC5sb2NhdGlvbi5wcm90b2NvbH0vLyR7ZG9jdW1lbnQubG9jYXRpb24uaG9zdH0ke2RvY3VtZW50LmxvY2F0aW9uLnBhdGhuYW1lfSR7cXVlcnl9YFxuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBkb2N1bWVudC5sb2NhdGlvbiA9IGZ1bGxVUkxcbiAgfVxuXG4gIGNvbnN0IHVpID0gY3JlYXRlVUkoKVxuICBjb25zdCBleHBvcnRlciA9IGNyZWF0ZUV4cG9ydGVyKHNhbmRib3gsIG1vbmFjbywgdWkpXG5cbiAgY29uc3QgcGxheWdyb3VuZCA9IHtcbiAgICBleHBvcnRlcixcbiAgICB1aSxcbiAgICByZWdpc3RlclBsdWdpbixcbiAgfVxuXG4gIHdpbmRvdy50cyA9IHNhbmRib3gudHNcbiAgd2luZG93LnNhbmRib3ggPSBzYW5kYm94XG4gIHdpbmRvdy5wbGF5Z3JvdW5kID0gcGxheWdyb3VuZFxuXG4gIGNvbnNvbGUubG9nKGBVc2luZyBUeXBlU2NyaXB0ICR7d2luZG93LnRzLnZlcnNpb259YClcblxuICBjb25zb2xlLmxvZygnQXZhaWxhYmxlIGdsb2JhbHM6JylcbiAgY29uc29sZS5sb2coJ1xcdHdpbmRvdy50cycsIHdpbmRvdy50cylcbiAgY29uc29sZS5sb2coJ1xcdHdpbmRvdy5zYW5kYm94Jywgd2luZG93LnNhbmRib3gpXG4gIGNvbnNvbGUubG9nKCdcXHR3aW5kb3cucGxheWdyb3VuZCcsIHdpbmRvdy5wbGF5Z3JvdW5kKVxuXG4gIC8vIERldiBtb2RlIHBsdWdpblxuICBpZiAoYWxsb3dDb25uZWN0aW5nVG9Mb2NhbGhvc3QoKSkge1xuICAgIHdpbmRvdy5leHBvcnRzID0ge31cbiAgICBjb25zb2xlLmxvZygnQ29ubmVjdGluZyB0byBkZXYgcGx1Z2luJylcbiAgICB0cnkge1xuICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgY29uc3QgcmUgPSB3aW5kb3cucmVxdWlyZVxuICAgICAgcmUoWydsb2NhbC9pbmRleCddLCAoZGV2UGx1Z2luOiBhbnkpID0+IHtcbiAgICAgICAgY29uc29sZS5sb2coJ1NldCB1cCBkZXYgcGx1Z2luIGZyb20gbG9jYWxob3N0OjUwMDAnKVxuICAgICAgICBjb25zb2xlLmxvZyhkZXZQbHVnaW4pXG4gICAgICAgIHBsYXlncm91bmQucmVnaXN0ZXJQbHVnaW4oZGV2UGx1Z2luKVxuXG4gICAgICAgIC8vIEF1dG8tc2VsZWN0IHRoZSBkZXYgcGx1Z2luXG4gICAgICAgIGFjdGl2YXRlUGx1Z2luKGRldlBsdWdpbiwgY3VycmVudFBsdWdpbigpLCBzYW5kYm94LCB0YWJCYXIsIGNvbnRhaW5lcilcbiAgICAgIH0pXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1Byb2JsZW0gbG9hZGluZyB1cCB0aGUgZGV2IHBsdWdpbicpXG4gICAgICBjb25zb2xlLmVycm9yKGVycm9yKVxuICAgIH1cbiAgfVxuXG4gIGFjdGl2ZVBsdWdpbnMoKS5mb3JFYWNoKHBsdWdpbiA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgIGNvbnN0IHJlID0gd2luZG93LnJlcXVpcmVcbiAgICAgIHJlKFtgdW5wa2cvJHtwbHVnaW4ubW9kdWxlfUBsYXRlc3QvZGlzdC9pbmRleGBdLCAoZGV2UGx1Z2luOiBQbGF5Z3JvdW5kUGx1Z2luKSA9PiB7XG4gICAgICAgIHBsYXlncm91bmQucmVnaXN0ZXJQbHVnaW4oZGV2UGx1Z2luKVxuXG4gICAgICAgIC8vIEF1dG8tc2VsZWN0IHRoZSBkZXYgcGx1Z2luXG4gICAgICAgIGlmIChkZXZQbHVnaW4uc2hvdWxkQmVTZWxlY3RlZCAmJiBkZXZQbHVnaW4uc2hvdWxkQmVTZWxlY3RlZCgpKSB7XG4gICAgICAgICAgYWN0aXZhdGVQbHVnaW4oZGV2UGx1Z2luLCBjdXJyZW50UGx1Z2luKCksIHNhbmRib3gsIHRhYkJhciwgY29udGFpbmVyKVxuICAgICAgICB9XG4gICAgICB9KVxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdQcm9ibGVtIGxvYWRpbmcgdXAgdGhlIHBsdWdpbjonLCBwbHVnaW4pXG4gICAgICBjb25zb2xlLmVycm9yKGVycm9yKVxuICAgIH1cbiAgfSlcblxuICByZXR1cm4gcGxheWdyb3VuZFxufVxuXG5leHBvcnQgdHlwZSBQbGF5Z3JvdW5kID0gUmV0dXJuVHlwZTx0eXBlb2Ygc2V0dXBQbGF5Z3JvdW5kPlxuIl19
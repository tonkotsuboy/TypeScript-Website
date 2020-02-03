define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /** Whether the playground should actively reach out to an existing plugin */
    exports.allowConnectingToLocalhost = () => {
        return !!localStorage.getItem('compiler-setting-connect-dev-plugin');
    };
    const settings = [
        {
            display: 'Disable ATA',
            blurb: 'Disable the automatic acquisition of types for imports and requires',
            flag: 'disable-ata',
        },
        {
            display: 'Disable Save-On-Type',
            blurb: 'Disable changing the URL when you type',
            flag: 'disable-save-on-type',
        },
    ];
    const pluginRegistry = [
        {
            module: 'typescript-playground-presentation-mode',
            display: 'Presentation Mode',
            blurb: 'Create presentations inside the TypeScript playground, seamlessly jump between slides and live-code.',
            repo: 'https://github.com/orta/playground-slides/#README',
            author: {
                name: 'Orta',
                href: 'https://orta.io',
            },
        },
    ];
    const removeCustomPlugins = (mod) => {
        const newPlugins = customPlugins().filter(p => p !== mod);
        localStorage.setItem('custom-plugins-playground', JSON.stringify(newPlugins));
    };
    const addCustomPlugin = (mod) => {
        const newPlugins = customPlugins();
        newPlugins.push(mod);
        localStorage.setItem('custom-plugins-playground', JSON.stringify(newPlugins));
    };
    const customPlugins = () => {
        return JSON.parse(localStorage.getItem('custom-plugins-playground') || '[]');
    };
    exports.activePlugins = () => {
        const existing = customPlugins().map(module => ({ module }));
        return existing.concat(pluginRegistry.filter(p => !!localStorage.getItem('plugin-' + p.module)));
    };
    const announceWeNeedARestart = () => {
        document.getElementById('restart-required').style.display = 'block';
    };
    exports.optionsPlugin = () => {
        const plugin = {
            id: 'options',
            displayName: 'Options',
            // shouldBeSelected: () => true, // uncomment to make this the first tab on reloads
            willMount: (_sandbox, container) => {
                const categoryDiv = document.createElement('div');
                container.appendChild(categoryDiv);
                const p = document.createElement('p');
                p.id = 'restart-required';
                p.textContent = 'Restart required';
                categoryDiv.appendChild(p);
                const ol = document.createElement('ol');
                ol.className = 'playground-options';
                createSection('Options', categoryDiv);
                settings.forEach(setting => {
                    const settingButton = createButton(setting);
                    ol.appendChild(settingButton);
                });
                categoryDiv.appendChild(ol);
                createSection('External Plugins', categoryDiv);
                const pluginsOL = document.createElement('ol');
                pluginsOL.className = 'playground-plugins';
                pluginRegistry.forEach(plugin => {
                    const settingButton = createPlugin(plugin);
                    pluginsOL.appendChild(settingButton);
                });
                categoryDiv.appendChild(pluginsOL);
                const warning = document.createElement('p');
                warning.className = 'warning';
                warning.textContent = 'Warning: Code from plugins comes from third-parties.';
                categoryDiv.appendChild(warning);
                createSection('Custom Modules', categoryDiv);
                const customModulesOL = document.createElement('ol');
                customModulesOL.className = 'custom-modules';
                const updateCustomModules = () => {
                    while (customModulesOL.firstChild) {
                        customModulesOL.removeChild(customModulesOL.firstChild);
                    }
                    customPlugins().forEach(module => {
                        const li = document.createElement('li');
                        li.innerHTML = module;
                        const a = document.createElement('a');
                        a.href = '#';
                        a.textContent = 'X';
                        a.onclick = () => {
                            removeCustomPlugins(module);
                            updateCustomModules();
                            announceWeNeedARestart();
                            return false;
                        };
                        li.appendChild(a);
                        customModulesOL.appendChild(li);
                    });
                };
                updateCustomModules();
                categoryDiv.appendChild(customModulesOL);
                const inputForm = createNewModuleInputForm(updateCustomModules);
                categoryDiv.appendChild(inputForm);
                createSection('Plugin Dev', categoryDiv);
                const pluginsDevOL = document.createElement('ol');
                pluginsDevOL.className = 'playground-options';
                const connectToDev = createButton({
                    display: 'Connect to <code>localhost:5000/index.js</code>',
                    blurb: "Automatically try connect to a playground plugin in development mode. You can read more <a href='http://TBD'>here</a>.",
                    flag: 'connect-dev-plugin',
                });
                pluginsDevOL.appendChild(connectToDev);
                categoryDiv.appendChild(pluginsDevOL);
            },
        };
        return plugin;
    };
    const createSection = (title, container) => {
        const pluginDevTitle = document.createElement('h4');
        pluginDevTitle.textContent = title;
        container.appendChild(pluginDevTitle);
    };
    const createPlugin = (plugin) => {
        const li = document.createElement('li');
        const div = document.createElement('div');
        const label = document.createElement('label');
        const top = `<span>${plugin.display}</span> by <a href='${plugin.author.href}'>${plugin.author.name}</a><br/>${plugin.blurb}`;
        const bottom = `<a href='https://www.npmjs.com/package${plugin.module}'>npm</a> | <a href="${plugin.repo}">repo</a>`;
        label.innerHTML = `${top}<br/>${bottom}`;
        const key = 'plugin-' + plugin.module;
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.id = key;
        input.checked = !!localStorage.getItem(key);
        input.onchange = () => {
            announceWeNeedARestart();
            if (input.checked) {
                localStorage.setItem(key, 'true');
            }
            else {
                localStorage.removeItem(key);
            }
        };
        label.htmlFor = input.id;
        div.appendChild(input);
        div.appendChild(label);
        li.appendChild(div);
        return li;
    };
    const createButton = (setting) => {
        const li = document.createElement('li');
        const label = document.createElement('label');
        label.innerHTML = `<span>${setting.display}</span><br/>${setting.blurb}`;
        const key = 'compiler-setting-' + setting.flag;
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.id = key;
        input.checked = !!localStorage.getItem(key);
        input.onchange = () => {
            if (input.checked) {
                localStorage.setItem(key, 'true');
            }
            else {
                localStorage.removeItem(key);
            }
        };
        label.htmlFor = input.id;
        li.appendChild(input);
        li.appendChild(label);
        return li;
    };
    const createNewModuleInputForm = (updateOL) => {
        const form = document.createElement('form');
        const newModuleInput = document.createElement('input');
        newModuleInput.type = 'text';
        newModuleInput.id = 'gist-input';
        newModuleInput.placeholder = 'Module from npm';
        form.appendChild(newModuleInput);
        form.onsubmit = e => {
            announceWeNeedARestart();
            addCustomPlugin(newModuleInput.value);
            e.stopPropagation();
            updateOL();
            return false;
        };
        return form;
    };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3B0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3BsYXlncm91bmQvc3JjL3NpZGViYXIvb3B0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7SUFFQSw2RUFBNkU7SUFDaEUsUUFBQSwwQkFBMEIsR0FBRyxHQUFHLEVBQUU7UUFDN0MsT0FBTyxDQUFDLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxxQ0FBcUMsQ0FBQyxDQUFBO0lBQ3RFLENBQUMsQ0FBQTtJQUVELE1BQU0sUUFBUSxHQUFHO1FBQ2Y7WUFDRSxPQUFPLEVBQUUsYUFBYTtZQUN0QixLQUFLLEVBQUUscUVBQXFFO1lBQzVFLElBQUksRUFBRSxhQUFhO1NBQ3BCO1FBQ0Q7WUFDRSxPQUFPLEVBQUUsc0JBQXNCO1lBQy9CLEtBQUssRUFBRSx3Q0FBd0M7WUFDL0MsSUFBSSxFQUFFLHNCQUFzQjtTQUM3QjtLQU1GLENBQUE7SUFFRCxNQUFNLGNBQWMsR0FBRztRQUNyQjtZQUNFLE1BQU0sRUFBRSx5Q0FBeUM7WUFDakQsT0FBTyxFQUFFLG1CQUFtQjtZQUM1QixLQUFLLEVBQUUsc0dBQXNHO1lBQzdHLElBQUksRUFBRSxtREFBbUQ7WUFDekQsTUFBTSxFQUFFO2dCQUNOLElBQUksRUFBRSxNQUFNO2dCQUNaLElBQUksRUFBRSxpQkFBaUI7YUFDeEI7U0FDRjtLQUNGLENBQUE7SUFFRCxNQUFNLG1CQUFtQixHQUFHLENBQUMsR0FBVyxFQUFFLEVBQUU7UUFDMUMsTUFBTSxVQUFVLEdBQUcsYUFBYSxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFBO1FBQ3pELFlBQVksQ0FBQyxPQUFPLENBQUMsMkJBQTJCLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFBO0lBQy9FLENBQUMsQ0FBQTtJQUVELE1BQU0sZUFBZSxHQUFHLENBQUMsR0FBVyxFQUFF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SyxDQUFDLEVBQUUsQ0FBQTtRQUV4QixFQUFFLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3JCLEVBQUUsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDckIsT0FBTyxFQUFFLENBQUE7SUFDWCxDQUFDLENBQUE7SUFFRCxNQUFNLHdCQUF3QixHQUFHLENBQUMsUUFBa0IsRUFBRSxFQUFFO1FBQ3RELE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUE7UUFFM0MsTUFBTSxjQUFjLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUN0RCxjQUFjLENBQUMsSUFBSSxHQUFHLE1BQU0sQ0FBQTtRQUM1QixjQUFjLENBQUMsRUFBRSxHQUFHLFlBQVksQ0FBQTtRQUNoQyxjQUFjLENBQUMsV0FBVyxHQUFHLGlCQUFpQixDQUFBO1FBQzlDLElBQUksQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDLENBQUE7UUFFaEMsSUFBSSxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsRUFBRTtZQUNsQixzQkFBc0IsRUFBRSxDQUFBO1lBQ3hCLGVBQWUsQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDckMsQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFBO1lBQ25CLFFBQVEsRUFBRSxDQUFBO1lBQ1YsT0FBTyxLQUFLLENBQUE7UUFDZCxDQUFDLENBQUE7UUFFRCxPQUFPLElBQUksQ0FBQTtJQUNiLENBQUMsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFBsYXlncm91bmRQbHVnaW4gfSBmcm9tICcuLidcblxuLyoqIFdoZXRoZXIgdGhlIHBsYXlncm91bmQgc2hvdWxkIGFjdGl2ZWx5IHJlYWNoIG91dCB0byBhbiBleGlzdGluZyBwbHVnaW4gKi9cbmV4cG9ydCBjb25zdCBhbGxvd0Nvbm5lY3RpbmdUb0xvY2FsaG9zdCA9ICgpID0+IHtcbiAgcmV0dXJuICEhbG9jYWxTdG9yYWdlLmdldEl0ZW0oJ2NvbXBpbGVyLXNldHRpbmctY29ubmVjdC1kZXYtcGx1Z2luJylcbn1cblxuY29uc3Qgc2V0dGluZ3MgPSBbXG4gIHtcbiAgICBkaXNwbGF5OiAnRGlzYWJsZSBBVEEnLFxuICAgIGJsdXJiOiAnRGlzYWJsZSB0aGUgYXV0b21hdGljIGFjcXVpc2l0aW9uIG9mIHR5cGVzIGZvciBpbXBvcnRzIGFuZCByZXF1aXJlcycsXG4gICAgZmxhZzogJ2Rpc2FibGUtYXRhJyxcbiAgfSxcbiAge1xuICAgIGRpc3BsYXk6ICdEaXNhYmxlIFNhdmUtT24tVHlwZScsXG4gICAgYmx1cmI6ICdEaXNhYmxlIGNoYW5naW5nIHRoZSBVUkwgd2hlbiB5b3UgdHlwZScsXG4gICAgZmxhZzogJ2Rpc2FibGUtc2F2ZS1vbi10eXBlJyxcbiAgfSxcbiAgLy8ge1xuICAvLyAgIGRpc3BsYXk6ICdWZXJib3NlIExvZ2dpbmcnLFxuICAvLyAgIGJsdXJiOiAnVHVybiBvbiBzdXBlcmZsdW91cyBsb2dnaW5nJyxcbiAgLy8gICBmbGFnOiAnZW5hYmxlLXN1cGVyZmx1b3VzLWxvZ2dpbmcnLFxuICAvLyB9LFxuXVxuXG5jb25zdCBwbHVnaW5SZWdpc3RyeSA9IFtcbiAge1xuICAgIG1vZHVsZTogJ3R5cGVzY3JpcHQtcGxheWdyb3VuZC1wcmVzZW50YXRpb24tbW9kZScsXG4gICAgZGlzcGxheTogJ1ByZXNlbnRhdGlvbiBNb2RlJyxcbiAgICBibHVyYjogJ0NyZWF0ZSBwcmVzZW50YXRpb25zIGluc2lkZSB0aGUgVHlwZVNjcmlwdCBwbGF5Z3JvdW5kLCBzZWFtbGVzc2x5IGp1bXAgYmV0d2VlbiBzbGlkZXMgYW5kIGxpdmUtY29kZS4nLFxuICAgIHJlcG86ICdodHRwczovL2dpdGh1Yi5jb20vb3J0YS9wbGF5Z3JvdW5kLXNsaWRlcy8jUkVBRE1FJyxcbiAgICBhdXRob3I6IHtcbiAgICAgIG5hbWU6ICdPcnRhJyxcbiAgICAgIGhyZWY6ICdodHRwczovL29ydGEuaW8nLFxuICAgIH0sXG4gIH0sXG5dXG5cbmNvbnN0IHJlbW92ZUN1c3RvbVBsdWdpbnMgPSAobW9kOiBzdHJpbmcpID0+IHtcbiAgY29uc3QgbmV3UGx1Z2lucyA9IGN1c3RvbVBsdWdpbnMoKS5maWx0ZXIocCA9PiBwICE9PSBtb2QpXG4gIGxvY2FsU3RvcmFnZS5zZXRJdGVtKCdjdXN0b20tcGx1Z2lucy1wbGF5Z3JvdW5kJywgSlNPTi5zdHJpbmdpZnkobmV3UGx1Z2lucykpXG59XG5cbmNvbnN0IGFkZEN1c3RvbVBsdWdpbiA9IChtb2Q6IHN0cmluZykgPT4ge1xuICBjb25zdCBuZXdQbHVnaW5zID0gY3VzdG9tUGx1Z2lucygpXG4gIG5ld1BsdWdpbnMucHVzaChtb2QpXG4gIGxvY2FsU3RvcmFnZS5zZXRJdGVtKCdjdXN0b20tcGx1Z2lucy1wbGF5Z3JvdW5kJywgSlNPTi5zdHJpbmdpZnkobmV3UGx1Z2lucykpXG59XG5cbmNvbnN0IGN1c3RvbVBsdWdpbnMgPSAoKTogc3RyaW5nW10gPT4ge1xuICByZXR1cm4gSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnY3VzdG9tLXBsdWdpbnMtcGxheWdyb3VuZCcpIHx8ICdbXScpXG59XG5cbmV4cG9ydCBjb25zdCBhY3RpdmVQbHVnaW5zID0gKCkgPT4ge1xuICBjb25zdCBleGlzdGluZyA9IGN1c3RvbVBsdWdpbnMoKS5tYXAobW9kdWxlID0+ICh7IG1vZHVsZSB9KSlcbiAgcmV0dXJuIGV4aXN0aW5nLmNvbmNhdChwbHVnaW5SZWdpc3RyeS5maWx0ZXIocCA9PiAhIWxvY2FsU3RvcmFnZS5nZXRJdGVtKCdwbHVnaW4tJyArIHAubW9kdWxlKSkpXG59XG5cbmNvbnN0IGFubm91bmNlV2VOZWVkQVJlc3RhcnQgPSAoKSA9PiB7XG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyZXN0YXJ0LXJlcXVpcmVkJykhLnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snXG59XG5cbmV4cG9ydCBjb25zdCBvcHRpb25zUGx1Z2luID0gKCkgPT4ge1xuICBjb25zdCBwbHVnaW46IFBsYXlncm91bmRQbHVnaW4gPSB7XG4gICAgaWQ6ICdvcHRpb25zJyxcbiAgICBkaXNwbGF5TmFtZTogJ09wdGlvbnMnLFxuICAgIC8vIHNob3VsZEJlU2VsZWN0ZWQ6ICgpID0+IHRydWUsIC8vIHVuY29tbWVudCB0byBtYWtlIHRoaXMgdGhlIGZpcnN0IHRhYiBvbiByZWxvYWRzXG4gICAgd2lsbE1vdW50OiAoX3NhbmRib3gsIGNvbnRhaW5lcikgPT4ge1xuICAgICAgY29uc3QgY2F0ZWdvcnlEaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuICAgICAgY29udGFpbmVyLmFwcGVuZENoaWxkKGNhdGVnb3J5RGl2KVxuXG4gICAgICBjb25zdCBwID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgncCcpXG4gICAgICBwLmlkID0gJ3Jlc3RhcnQtcmVxdWlyZWQnXG4gICAgICBwLnRleHRDb250ZW50ID0gJ1Jlc3RhcnQgcmVxdWlyZWQnXG4gICAgICBjYXRlZ29yeURpdi5hcHBlbmRDaGlsZChwKVxuXG4gICAgICBjb25zdCBvbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ29sJylcbiAgICAgIG9sLmNsYXNzTmFtZSA9ICdwbGF5Z3JvdW5kLW9wdGlvbnMnXG5cbiAgICAgIGNyZWF0ZVNlY3Rpb24oJ09wdGlvbnMnLCBjYXRlZ29yeURpdilcblxuICAgICAgc2V0dGluZ3MuZm9yRWFjaChzZXR0aW5nID0+IHtcbiAgICAgICAgY29uc3Qgc2V0dGluZ0J1dHRvbiA9IGNyZWF0ZUJ1dHRvbihzZXR0aW5nKVxuICAgICAgICBvbC5hcHBlbmRDaGlsZChzZXR0aW5nQnV0dG9uKVxuICAgICAgfSlcblxuICAgICAgY2F0ZWdvcnlEaXYuYXBwZW5kQ2hpbGQob2wpXG5cbiAgICAgIGNyZWF0ZVNlY3Rpb24oJ0V4dGVybmFsIFBsdWdpbnMnLCBjYXRlZ29yeURpdilcblxuICAgICAgY29uc3QgcGx1Z2luc09MID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnb2wnKVxuICAgICAgcGx1Z2luc09MLmNsYXNzTmFtZSA9ICdwbGF5Z3JvdW5kLXBsdWdpbnMnXG4gICAgICBwbHVnaW5SZWdpc3RyeS5mb3JFYWNoKHBsdWdpbiA9PiB7XG4gICAgICAgIGNvbnN0IHNldHRpbmdCdXR0b24gPSBjcmVhdGVQbHVnaW4ocGx1Z2luKVxuICAgICAgICBwbHVnaW5zT0wuYXBwZW5kQ2hpbGQoc2V0dGluZ0J1dHRvbilcbiAgICAgIH0pXG4gICAgICBjYXRlZ29yeURpdi5hcHBlbmRDaGlsZChwbHVnaW5zT0wpXG5cbiAgICAgIGNvbnN0IHdhcm5pbmcgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdwJylcbiAgICAgIHdhcm5pbmcuY2xhc3NOYW1lID0gJ3dhcm5pbmcnXG4gICAgICB3YXJuaW5nLnRleHRDb250ZW50ID0gJ1dhcm5pbmc6IENvZGUgZnJvbSBwbHVnaW5zIGNvbWVzIGZyb20gdGhpcmQtcGFydGllcy4nXG4gICAgICBjYXRlZ29yeURpdi5hcHBlbmRDaGlsZCh3YXJuaW5nKVxuXG4gICAgICBjcmVhdGVTZWN0aW9uKCdDdXN0b20gTW9kdWxlcycsIGNhdGVnb3J5RGl2KVxuICAgICAgY29uc3QgY3VzdG9tTW9kdWxlc09MID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnb2wnKVxuICAgICAgY3VzdG9tTW9kdWxlc09MLmNsYXNzTmFtZSA9ICdjdXN0b20tbW9kdWxlcydcblxuICAgICAgY29uc3QgdXBkYXRlQ3VzdG9tTW9kdWxlcyA9ICgpID0+IHtcbiAgICAgICAgd2hpbGUgKGN1c3RvbU1vZHVsZXNPTC5maXJzdENoaWxkKSB7XG4gICAgICAgICAgY3VzdG9tTW9kdWxlc09MLnJlbW92ZUNoaWxkKGN1c3RvbU1vZHVsZXNPTC5maXJzdENoaWxkKVxuICAgICAgICB9XG4gICAgICAgIGN1c3RvbVBsdWdpbnMoKS5mb3JFYWNoKG1vZHVsZSA9PiB7XG4gICAgICAgICAgY29uc3QgbGkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaScpXG4gICAgICAgICAgbGkuaW5uZXJIVE1MID0gbW9kdWxlXG4gICAgICAgICAgY29uc3QgYSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKVxuICAgICAgICAgIGEuaHJlZiA9ICcjJ1xuICAgICAgICAgIGEudGV4dENvbnRlbnQgPSAnWCdcbiAgICAgICAgICBhLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICAgICAgICByZW1vdmVDdXN0b21QbHVnaW5zKG1vZHVsZSlcbiAgICAgICAgICAgIHVwZGF0ZUN1c3RvbU1vZHVsZXMoKVxuICAgICAgICAgICAgYW5ub3VuY2VXZU5lZWRBUmVzdGFydCgpXG4gICAgICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgICAgICB9XG4gICAgICAgICAgbGkuYXBwZW5kQ2hpbGQoYSlcblxuICAgICAgICAgIGN1c3RvbU1vZHVsZXNPTC5hcHBlbmRDaGlsZChsaSlcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICAgIHVwZGF0ZUN1c3RvbU1vZHVsZXMoKVxuXG4gICAgICBjYXRlZ29yeURpdi5hcHBlbmRDaGlsZChjdXN0b21Nb2R1bGVzT0wpXG4gICAgICBjb25zdCBpbnB1dEZvcm0gPSBjcmVhdGVOZXdNb2R1bGVJbnB1dEZvcm0odXBkYXRlQ3VzdG9tTW9kdWxlcylcbiAgICAgIGNhdGVnb3J5RGl2LmFwcGVuZENoaWxkKGlucHV0Rm9ybSlcblxuICAgICAgY3JlYXRlU2VjdGlvbignUGx1Z2luIERldicsIGNhdGVnb3J5RGl2KVxuXG4gICAgICBjb25zdCBwbHVnaW5zRGV2T0wgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdvbCcpXG4gICAgICBwbHVnaW5zRGV2T0wuY2xhc3NOYW1lID0gJ3BsYXlncm91bmQtb3B0aW9ucydcbiAgICAgIGNvbnN0IGNvbm5lY3RUb0RldiA9IGNyZWF0ZUJ1dHRvbih7XG4gICAgICAgIGRpc3BsYXk6ICdDb25uZWN0IHRvIDxjb2RlPmxvY2FsaG9zdDo1MDAwL2luZGV4LmpzPC9jb2RlPicsXG4gICAgICAgIGJsdXJiOlxuICAgICAgICAgIFwiQXV0b21hdGljYWxseSB0cnkgY29ubmVjdCB0byBhIHBsYXlncm91bmQgcGx1Z2luIGluIGRldmVsb3BtZW50IG1vZGUuIFlvdSBjYW4gcmVhZCBtb3JlIDxhIGhyZWY9J2h0dHA6Ly9UQkQnPmhlcmU8L2E+LlwiLFxuICAgICAgICBmbGFnOiAnY29ubmVjdC1kZXYtcGx1Z2luJyxcbiAgICAgIH0pXG4gICAgICBwbHVnaW5zRGV2T0wuYXBwZW5kQ2hpbGQoY29ubmVjdFRvRGV2KVxuXG4gICAgICBjYXRlZ29yeURpdi5hcHBlbmRDaGlsZChwbHVnaW5zRGV2T0wpXG4gICAgfSxcbiAgfVxuXG4gIHJldHVybiBwbHVnaW5cbn1cblxuY29uc3QgY3JlYXRlU2VjdGlvbiA9ICh0aXRsZTogc3RyaW5nLCBjb250YWluZXI6IEVsZW1lbnQpID0+IHtcbiAgY29uc3QgcGx1Z2luRGV2VGl0bGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdoNCcpXG4gIHBsdWdpbkRldlRpdGxlLnRleHRDb250ZW50ID0gdGl0bGVcbiAgY29udGFpbmVyLmFwcGVuZENoaWxkKHBsdWdpbkRldlRpdGxlKVxufVxuXG5jb25zdCBjcmVhdGVQbHVnaW4gPSAocGx1Z2luOiB0eXBlb2YgcGx1Z2luUmVnaXN0cnlbMF0pID0+IHtcbiAgY29uc3QgbGkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaScpXG4gIGNvbnN0IGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG5cbiAgY29uc3QgbGFiZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsYWJlbCcpXG5cbiAgY29uc3QgdG9wID0gYDxzcGFuPiR7cGx1Z2luLmRpc3BsYXl9PC9zcGFuPiBieSA8YSBocmVmPScke3BsdWdpbi5hdXRob3IuaHJlZn0nPiR7cGx1Z2luLmF1dGhvci5uYW1lfTwvYT48YnIvPiR7cGx1Z2luLmJsdXJifWBcbiAgY29uc3QgYm90dG9tID0gYDxhIGhyZWY9J2h0dHBzOi8vd3d3Lm5wbWpzLmNvbS9wYWNrYWdlJHtwbHVnaW4ubW9kdWxlfSc+bnBtPC9hPiB8IDxhIGhyZWY9XCIke3BsdWdpbi5yZXBvfVwiPnJlcG88L2E+YFxuICBsYWJlbC5pbm5lckhUTUwgPSBgJHt0b3B9PGJyLz4ke2JvdHRvbX1gXG5cbiAgY29uc3Qga2V5ID0gJ3BsdWdpbi0nICsgcGx1Z2luLm1vZHVsZVxuICBjb25zdCBpbnB1dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lucHV0JylcbiAgaW5wdXQudHlwZSA9ICdjaGVja2JveCdcbiAgaW5wdXQuaWQgPSBrZXlcbiAgaW5wdXQuY2hlY2tlZCA9ICEhbG9jYWxTdG9yYWdlLmdldEl0ZW0oa2V5KVxuXG4gIGlucHV0Lm9uY2hhbmdlID0gKCkgPT4ge1xuICAgIGFubm91bmNlV2VOZWVkQVJlc3RhcnQoKVxuICAgIGlmIChpbnB1dC5jaGVja2VkKSB7XG4gICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShrZXksICd0cnVlJylcbiAgICB9IGVsc2Uge1xuICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oa2V5KVxuICAgIH1cbiAgfVxuXG4gIGxhYmVsLmh0bWxGb3IgPSBpbnB1dC5pZFxuXG4gIGRpdi5hcHBlbmRDaGlsZChpbnB1dClcbiAgZGl2LmFwcGVuZENoaWxkKGxhYmVsKVxuICBsaS5hcHBlbmRDaGlsZChkaXYpXG4gIHJldHVybiBsaVxufVxuXG5jb25zdCBjcmVhdGVCdXR0b24gPSAoc2V0dGluZzogeyBibHVyYjogc3RyaW5nOyBmbGFnOiBzdHJpbmc7IGRpc3BsYXk6IHN0cmluZyB9KSA9PiB7XG4gIGNvbnN0IGxpID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGknKVxuICBjb25zdCBsYWJlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xhYmVsJylcbiAgbGFiZWwuaW5uZXJIVE1MID0gYDxzcGFuPiR7c2V0dGluZy5kaXNwbGF5fTwvc3Bhbj48YnIvPiR7c2V0dGluZy5ibHVyYn1gXG5cbiAgY29uc3Qga2V5ID0gJ2NvbXBpbGVyLXNldHRpbmctJyArIHNldHRpbmcuZmxhZ1xuICBjb25zdCBpbnB1dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lucHV0JylcbiAgaW5wdXQudHlwZSA9ICdjaGVja2JveCdcbiAgaW5wdXQuaWQgPSBrZXlcbiAgaW5wdXQuY2hlY2tlZCA9ICEhbG9jYWxTdG9yYWdlLmdldEl0ZW0oa2V5KVxuXG4gIGlucHV0Lm9uY2hhbmdlID0gKCkgPT4ge1xuICAgIGlmIChpbnB1dC5jaGVja2VkKSB7XG4gICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShrZXksICd0cnVlJylcbiAgICB9IGVsc2Uge1xuICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oa2V5KVxuICAgIH1cbiAgfVxuXG4gIGxhYmVsLmh0bWxGb3IgPSBpbnB1dC5pZFxuXG4gIGxpLmFwcGVuZENoaWxkKGlucHV0KVxuICBsaS5hcHBlbmRDaGlsZChsYWJlbClcbiAgcmV0dXJuIGxpXG59XG5cbmNvbnN0IGNyZWF0ZU5ld01vZHVsZUlucHV0Rm9ybSA9ICh1cGRhdGVPTDogRnVuY3Rpb24pID0+IHtcbiAgY29uc3QgZm9ybSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2Zvcm0nKVxuXG4gIGNvbnN0IG5ld01vZHVsZUlucHV0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW5wdXQnKVxuICBuZXdNb2R1bGVJbnB1dC50eXBlID0gJ3RleHQnXG4gIG5ld01vZHVsZUlucHV0LmlkID0gJ2dpc3QtaW5wdXQnXG4gIG5ld01vZHVsZUlucHV0LnBsYWNlaG9sZGVyID0gJ01vZHVsZSBmcm9tIG5wbSdcbiAgZm9ybS5hcHBlbmRDaGlsZChuZXdNb2R1bGVJbnB1dClcblxuICBmb3JtLm9uc3VibWl0ID0gZSA9PiB7XG4gICAgYW5ub3VuY2VXZU5lZWRBUmVzdGFydCgpXG4gICAgYWRkQ3VzdG9tUGx1Z2luKG5ld01vZHVsZUlucHV0LnZhbHVlKVxuICAgIGUuc3RvcFByb3BhZ2F0aW9uKClcbiAgICB1cGRhdGVPTCgpXG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cblxuICByZXR1cm4gZm9ybVxufVxuIl19
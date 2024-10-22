 // 使用AJAX从远程JSON文件获取软件库列表
        function loadSoftwareList() {
            const xhr = new XMLHttpRequest();
            xhr.open("GET", "/ruanjianku.json", true);
            xhr.onload = function () {
                if (xhr.status === 200) {
                    const softwareList = JSON.parse(xhr.responseText);
                    const container = document.getElementById('软件库列表');
                    
                    // 遍历JSON数据并动态生成列表项
                    softwareList.forEach(item => {
                        const div = document.createElement('div');
                        div.className = '软件库块class';
                        div.setAttribute('onclick', `window.open('${item.url}', '_blank')`);
                        div.innerHTML = `<span class="lbk-wz-class">${item.name}</span>`;
                        container.appendChild(div);
                    });
                }
            };
            xhr.send();
        }

        // 调用函数加载软件库列表
        loadSoftwareList();
// 链接管理模块
const LinkManager = new BaseListManager({
    type: 'link',
    listId: 'linkList',
    modalId: 'linkEditModal',
    nameInputId: 'linkNameInput',
    urlInputId: 'linkUrlInput',
    iconGridId: 'iconGrid',
    firebaseMethods: {
        listen: 'listenToLinks',
        add: 'addLink',
        update: 'updateLink',
        delete: 'deleteLink',
        updateOrders: 'updateLinkOrders'
    }
});

// 暴露到全局
window.LinkManager = LinkManager;
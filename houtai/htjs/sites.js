// 站点访问管理模块
const SiteManager = new BaseListManager({
    type: 'site',
    listId: 'siteList',
    modalId: 'siteEditModal',
    nameInputId: 'siteNameInput',
    urlInputId: 'siteUrlInput',
    iconGridId: 'siteIconGrid',
    firebaseMethods: {
        listen: 'listenToSites',
        add: 'addSite',
        update: 'updateSite',
        delete: 'deleteSite',
        updateOrders: 'updateSiteOrders'
    }
});

// 暴露到全局
window.SiteManager = SiteManager;
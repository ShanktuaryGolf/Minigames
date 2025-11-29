
    (function() {
      var cdnOrigin = "https://cdn.shopify.com";
      var scripts = ["/cdn/shopifycloud/checkout-web/assets/c1/polyfills.TiXrO7Ka.js","/cdn/shopifycloud/checkout-web/assets/c1/app.BqGyW-KO.js","/cdn/shopifycloud/checkout-web/assets/c1/en.ByprQVe0.js","/cdn/shopifycloud/checkout-web/assets/c1/page-OnePage.Dhx3rTKb.js","/cdn/shopifycloud/checkout-web/assets/c1/DeliveryMethodSelectorSection.CsLOpOtI.js","/cdn/shopifycloud/checkout-web/assets/c1/useEditorShopPayNavigation.CA7h8sZL.js","/cdn/shopifycloud/checkout-web/assets/c1/VaultedPayment.BuDvMa6F.js","/cdn/shopifycloud/checkout-web/assets/c1/LocalizationExtensionField.DW9QXFTf.js","/cdn/shopifycloud/checkout-web/assets/c1/ShopPayOptInDisclaimer.DyH8X8pi.js","/cdn/shopifycloud/checkout-web/assets/c1/SeparatePaymentsNotice.vVD1X15T.js","/cdn/shopifycloud/checkout-web/assets/c1/ShipmentBreakdown.C7xkSCep.js","/cdn/shopifycloud/checkout-web/assets/c1/MerchandiseModal.Dn-1tudj.js","/cdn/shopifycloud/checkout-web/assets/c1/StackedMerchandisePreview.DCD4NAxy.js","/cdn/shopifycloud/checkout-web/assets/c1/component-ShopPayVerificationSwitch.BfmT1l8d.js","/cdn/shopifycloud/checkout-web/assets/c1/useSubscribeMessenger.BFIcP_aW.js","/cdn/shopifycloud/checkout-web/assets/c1/index.7VmopsOn.js","/cdn/shopifycloud/checkout-web/assets/c1/PayButtonSection.o7_M29O2.js"];
      var styles = ["/cdn/shopifycloud/checkout-web/assets/c1/assets/app.CSGTjRxA.css","/cdn/shopifycloud/checkout-web/assets/c1/assets/OnePage.PMX4OSBO.css","/cdn/shopifycloud/checkout-web/assets/c1/assets/DeliveryMethodSelectorSection.BvrdqG-K.css","/cdn/shopifycloud/checkout-web/assets/c1/assets/useEditorShopPayNavigation.CBpWLJzT.css","/cdn/shopifycloud/checkout-web/assets/c1/assets/VaultedPayment.OxMVm7u-.css","/cdn/shopifycloud/checkout-web/assets/c1/assets/StackedMerchandisePreview.CKAakmU8.css","/cdn/shopifycloud/checkout-web/assets/c1/assets/ShopPayVerificationSwitch.DW7NMDXG.css"];
      var fontPreconnectUrls = [];
      var fontPrefetchUrls = [];
      var imgPrefetchUrls = ["https://cdn.shopify.com/s/files/1/0093/2298/7617/files/71934307_1370691636413894_5357787262979407872_n_x320.png?v=1613534489"];

      function preconnect(url, callback) {
        var link = document.createElement('link');
        link.rel = 'dns-prefetch preconnect';
        link.href = url;
        link.crossOrigin = '';
        link.onload = link.onerror = callback;
        document.head.appendChild(link);
      }

      function preconnectAssets() {
        var resources = [cdnOrigin].concat(fontPreconnectUrls);
        var index = 0;
        (function next() {
          var res = resources[index++];
          if (res) preconnect(res, next);
        })();
      }

      function prefetch(url, as, callback) {
        var link = document.createElement('link');
        if (link.relList.supports('prefetch')) {
          link.rel = 'prefetch';
          link.fetchPriority = 'low';
          link.as = as;
          if (as === 'font') link.type = 'font/woff2';
          link.href = url;
          link.crossOrigin = '';
          link.onload = link.onerror = callback;
          document.head.appendChild(link);
        } else {
          var xhr = new XMLHttpRequest();
          xhr.open('GET', url, true);
          xhr.onloadend = callback;
          xhr.send();
        }
      }

      function prefetchAssets() {
        var resources = [].concat(
          scripts.map(function(url) { return [url, 'script']; }),
          styles.map(function(url) { return [url, 'style']; }),
          fontPrefetchUrls.map(function(url) { return [url, 'font']; }),
          imgPrefetchUrls.map(function(url) { return [url, 'image']; })
        );
        var index = 0;
        function run() {
          var res = resources[index++];
          if (res) prefetch(res[0], res[1], next);
        }
        var next = (self.requestIdleCallback || setTimeout).bind(self, run);
        next();
      }

      function onLoaded() {
        try {
          if (parseFloat(navigator.connection.effectiveType) > 2 && !navigator.connection.saveData) {
            preconnectAssets();
            prefetchAssets();
          }
        } catch (e) {}
      }

      if (document.readyState === 'complete') {
        onLoaded();
      } else {
        addEventListener('load', onLoaded);
      }
    })();
  
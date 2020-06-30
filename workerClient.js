var workerClient = {
	onServiceWorkerMessage: function(data){
		
		if(data.type == 'cacheReady'){
			console.log("cache ready");
		}
		console.log("sw message arrived");
	},

	init: function(callback){
		if(typeof(navigator.serviceWorker) !== 'undefined'){
			//loads the service worker js file by way of the index.php file in the ServiceWorker folder
			//best to use the index.php or similar in order to easily set certain http headers
			navigator.serviceWorker.register('ServiceWorker/')//,{scope:"https://www.example.com/"})
			.then(
				function(registration){
					//Registration was successful
					console.log('ServiceWorker registration successful with scope: ', registration.scope);
					callback();
				},
				function(err){
					//registration failed
					console.log('ServiceWorker registration failed: ', err);
					callback();
				}
			);
			
			navigator.serviceWorker.addEventListener(
				"message",
				function(e){
					console.log("sw-message:"+JSON.stringify(e.data));
					clientWorker.onServiceWorkerMessage(e.data);
				},
				false
			);
		}
		else{
			console.log("no service worker");
			callback();
		}
	}
};
/* site-dependent JSONMessage configuration: */
JSONRequest.options.ajax.url = 'lib/JSONMessage/JSONRequest-dispatch.php';
//JSONRequest.options.ajax.asynchronous = false;
//JSONRequest.options.ajax.method = 'GET';
//JSONRequest.options.ajax.timeout = 5;
//JSONRequest.prototype.postBackend = JSONRequest.postImpl.concrete.dojo;
//JSONRequest.prototype.postBackend = JSONRequest.postImpl.concrete.jQuery;
JSONRequest.prototype.postBackend = JSONRequest.postImpl.concrete.XMLHttpRequest;
//JSONRequest.prototype.postBackend = JSONRequest.postImpl.concrete.Prototype;

(function(){var g=typeof globalThis!=='undefined'?globalThis:window;g.globalThis=g;
if(!g.structuredClone)g.structuredClone=function(v){return v===undefined?v:JSON.parse(JSON.stringify(v))};
if(!g.queueMicrotask)g.queueMicrotask=function(f){Promise.resolve().then(f)};
if(!Element.prototype.replaceChildren)Element.prototype.replaceChildren=function(){while(this.firstChild)this.removeChild(this.firstChild);this.append.apply(this,arguments)};
if(!Object.fromEntries)Object.fromEntries=function(it){var o={};for(var e of it)o[e[0]]=e[1];return o}})();
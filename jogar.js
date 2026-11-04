(function(){var f=document.getElementById('jogo'),fa=document.getElementById('falha'),av=document.getElementById('aviso');
var ok=false;f.addEventListener('load',function(){ok=true;var l=document.getElementById('carr');if(l)l.remove()});
setTimeout(function(){if(!ok){fa.style.display='block';f.style.display='none'}},15000);
try{if(!localStorage.getItem('companha-aviso-web')){av.style.display='block';localStorage.setItem('companha-aviso-web','1');setTimeout(function(){av.style.display='none'},7000)}}catch(e){}
var e=document.getElementById('ecra');if(e)e.addEventListener('click',function(){var r=f.requestFullscreen||f.webkitRequestFullscreen;if(r)r.call(f)});})();

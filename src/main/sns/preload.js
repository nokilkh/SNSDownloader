const {contextBridge,ipcRenderer}=require('electron');
const channels=new Set(['state','save-account','remove-account','start','backup-post','control','folder','library','login','check-login',
  'paste-x-login','clear-login','language','source','reveal','copy','copy-text']);
contextBridge.exposeInMainWorld('sns',{
  invoke:(name,...args)=>{
    if(!channels.has(name))throw new Error('Unknown operation');
    return ipcRenderer.invoke('sns:'+name,...args);
  },
  onChange:callback=>ipcRenderer.on('sns:change',()=>callback())
});

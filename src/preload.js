const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('darkMode', {
	system: () => ipcRenderer.invoke('dark-mode:system')
})

contextBridge.exposeInMainWorld('engine', {
	browseFolder: (path) => ipcRenderer.invoke('browseFolder', path),
	loadImage: (path) => ipcRenderer.invoke('loadPhoto', path),
	loadExif: (path) => ipcRenderer.invoke('loadExif', path),
	saveExif: (path, data) => ipcRenderer.invoke('saveExif', path, data),
	getModelConfig: () => ipcRenderer.sendSync('modelConfig'),
	onImageData: (callback) => ipcRenderer.on('imageData', (e, path, data) => callback(path, data)),
	onExifData: (callback) => ipcRenderer.on('exifData', (e, path, data) => callback(path, data)),
	onError: (callback) => ipcRenderer.on('error', (e, tagName, errorMessage) => callback(tagName, errorMessage))
})

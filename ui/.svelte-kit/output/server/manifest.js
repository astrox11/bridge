export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["logo.png"]),
	mimeTypes: {".png":"image/png"},
	_: {
		client: {start:"_app/immutable/entry/start.yO7IPziO.js",app:"_app/immutable/entry/app.CJ_z4q-g.js",imports:["_app/immutable/entry/start.yO7IPziO.js","_app/immutable/chunks/DyqNcUkj.js","_app/immutable/chunks/-jyIGn8U.js","_app/immutable/chunks/B9nFVoo2.js","_app/immutable/chunks/Syu_8NVb.js","_app/immutable/entry/app.CJ_z4q-g.js","_app/immutable/chunks/-jyIGn8U.js","_app/immutable/chunks/D0Lkw7OS.js","_app/immutable/chunks/Syu_8NVb.js","_app/immutable/chunks/CWQxrqui.js","_app/immutable/chunks/DOnAEZBX.js","_app/immutable/chunks/Dmx6cC8U.js","_app/immutable/chunks/BvOK0ta7.js","_app/immutable/chunks/CoQf9udv.js","_app/immutable/chunks/B9nFVoo2.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js')),
			__memo(() => import('./nodes/3.js')),
			__memo(() => import('./nodes/4.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			},
			{
				id: "/news",
				pattern: /^\/news\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: null
			},
			{
				id: "/pair",
				pattern: /^\/pair\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 4 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();

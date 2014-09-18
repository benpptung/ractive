
function LifecycleHook ( event ) {
	var upperCase = event[0].toUpperCase() + event.substring(1);
	this.instanceEvent = event;
	this.instanceMethod = 'on' + upperCase;
	this.event = event + 'ed';
	this.method = 'on' + upperCase + 'ed';
	this.inProcess = {};
	this.queue = {};
}

LifecycleHook.prototype = {

	constructor: LifecycleHook,

	begin: function ( ractive ) {
		this.inProcess[ ractive._guid ] = true;
	},

	end: function ( ractive ) {

		var parent = ractive._parent;

		fireForInstance( this, ractive );

		if ( this.inProcess[ ractive._guid ] ) {

			// If this is *isn't* a child of a component that's in process,
			// it should call methods or fire at this point
			if ( !parent || !this.inProcess[ parent._guid ] ) {
				fireForQueue( this, ractive );
			}
			// elsewise, handoff to parent to fire when ready
			else {
				getChildQueue( this, parent ).push( ractive );
			}

			delete this.inProcess[ ractive._guid ];
		}
	}
};

function getChildQueue ( hook, ractive ) {
	return hook.queue[ ractive._guid ] || ( hook.queue[ ractive._guid ] = [] );
}

function fireForInstance ( hook, ractive ) {
	fireHook( ractive, hook.instanceMethod, hook.instanceEvent );
}

function fireForQueue ( hook, ractive ) {

	var childQueue = getChildQueue( hook, ractive );

	fireHook( ractive, hook.method, hook.event );

	// depricate in future vesion
	if ( hook.method === 'onInit' && ractive.init ) {
		// TODO: log deprication warning
		ractive.init();
	}

	// queue is "live" because components can end up being
	// added while hooks fire on parents that modify data values.
	while ( childQueue.length ) {
		fireForQueue( hook, childQueue.shift() );
	}

	delete hook.queue[ ractive._guid ];
}

function fireHook ( ractive, method, event ) {
	if ( ractive[ method ] ) {
		ractive[ method ]();
	}

	//depricate in future release
	if ( method === 'onInit' && ractive.init ) {
		ractive.init();
	}

	ractive.fire( event );
}

export default LifecycleHook;

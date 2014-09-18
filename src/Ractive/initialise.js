import config from 'config/config';
import create from 'utils/create';
import Fragment from 'virtualdom/Fragment';
import getElement from 'utils/getElement';
import getNextNumber from 'utils/getNextNumber';
import HookQueue from 'Ractive/prototype/shared/lifecycle/HookQueue';
import Viewmodel from 'viewmodel/Viewmodel';

var initHook = new HookQueue( 'init' );

export default function initialiseRactiveInstance ( ractive, options = {} ) {

	initialiseProperties( ractive, options );

	if ( ractive.onConstruct ) {
		ractive.onConstruct( options );
	}

	// init config from Parent and options
	config.init( ractive.constructor, ractive, options );

	if ( ractive.onConfig ) {
		ractive.onConfig();
	}

	initHook.begin( ractive );

	// TEMPORARY. This is so we can implement Viewmodel gradually
	ractive.viewmodel = new Viewmodel( ractive );

	// hacky circular problem until we get this sorted out
	// if viewmodel immediately processes computed properties,
	// they may call ractive.get, which calls ractive.viewmodel,
	// which hasn't been set till line above finishes.
	ractive.viewmodel.compute();

	// Render our *root fragment*
	if ( ractive.template ) {
		ractive.fragment = new Fragment({
			template: ractive.template,
			root: ractive,
			owner: ractive, // saves doing `if ( this.parent ) { /*...*/ }` later on
		});
	}

	initHook.end( ractive );

	// render automatically ( if `el` is specified )

	tryRender( ractive );
}

function tryRender ( ractive ) {
	var el;

	if ( el = getElement( ractive.el ) ) {
		// If the target contains content, and `append` is falsy, clear it
		if ( el && !ractive.append ) {
			// Tear down any existing instances on this element
			if ( el.__ractive_instances__ ) {
				try {
					el.__ractive_instances__.splice( 0, el.__ractive_instances__.length ).forEach( r => r.teardown() );
				} catch ( err ) {
					// this can happen with IE8, because it is unbelievably shit. Somehow, in
					// certain very specific situations, trying to access node.parentNode (which
					// we need to do in order to detach elements) causes an 'Invalid argument'
					// error to be thrown. I don't even.
				}
			}

			el.innerHTML = ''; // TODO is this quicker than removeChild? Initial research inconclusive
		}

		ractive.render( el, ractive.append );
	}
}

function initialiseProperties ( ractive, options ) {
	// Generate a unique identifier, for places where you'd use a weak map if it
	// existed
	ractive._guid = getNextNumber();

	// events
	ractive._subs = create( null );

	// storage for item configuration from instantiation to reset,
	// like dynamic functions or original values
	ractive._config = {};

	// two-way bindings
	ractive._twowayBindings = create( null );

	// animations (so we can stop any in progress at teardown)
	ractive._animations = [];

	// nodes registry
	ractive.nodes = {};

	// live queries
	ractive._liveQueries = [];
	ractive._liveComponentQueries = [];

	// If this is a component, store a reference to the parent
	if ( options._parent && options._component ) {

		ractive._parent = options._parent;
		ractive.component = options._component;

		// And store a reference to the instance on the component
		options._component.instance = ractive;
	}
}

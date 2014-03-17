function Editor() {
	this.domElement = document.createElement( 'section' );
	this.domElement.classList.add( 'editor-wrapper' );

    // Bind scope
    for( var i in this ) {
        if( typeof this[ i ] === 'function' ) {
            this[ i ] = this[ i ].bind( this );
        }
    }

	this._createScene();
	this._createParticles();

    window.addEventListener( 'resize', this._onResize, false );
}

Editor.prototype = {
    _createGrid: function() {
        if( this.grid && CONFIG.adaptiveGrid ) {
            this.scene.remove( this.grid );
        }
        else if( this.grid && !CONFIG.adaptiveGrid ) {
            return;
        }


        var size = 2,
            segments = 1,
            scale = CONFIG.adaptiveGrid ? 0.5 : 5;
            focusMeshScale = ( Math.max( this.focusMesh.scale.x, this.focusMesh.scale.z ) + 0.5 | 0 ) * scale;

        size *= focusMeshScale;
        segments = Math.sqrt( focusMeshScale ) + 0.5 | 0;

        this.grid = new THREE.Mesh(
            new THREE.PlaneGeometry( size, size, segments, segments ),
            new THREE.MeshBasicMaterial( {
                color: this.renderer.getClearColor().invert,
                opacity: 0.2,
                transparent: true,
                wireframe: true
            } )
        );
        this.grid.rotation.x = Math.PI * 0.5;
        this.scene.add( this.grid );
    },

	_createScene: function() {
        var self = this;

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 10000 );
        this.stats = new Stats();
        this.renderer = new THREE.WebGLRenderer( { antialias: true } );
        this.renderer.setSize( window.innerWidth, window.innerHeight );
        this.clock = new THREE.Clock();
        this.controls = new THREE.EditorControls( this.camera, this.renderer.domElement );
        this.worldAxis = new THREE.AxisHelper( 1 );

        this.worldAxis.material.linewidth = 1;
        this.worldAxis.material.depthTest = false;
        this.worldAxis.material.depthWrite = false;

        this.controls.addEventListener( 'change', function() {
            var absScale = self.camera.position.distanceTo( self.particleEmitter.position );

            self.worldAxis.scale.set( 
                absScale, absScale, absScale
            ).divideScalar( 5 );
        });

        this.controls.dispatchEvent( 'change' );

        this.scene.add( this.worldAxis );

        this.focusMesh = new THREE.Mesh(
            new THREE.CubeGeometry( 1, 1, 1 ),
            new THREE.MeshBasicMaterial( {
                color: 0x0b304c,
                wireframe: true,
                transparent: true,
                opacity: CONFIG.emitterBoundingBoxOpacity,
                wireframeLinewidth: 1,
                depthWrite: false,
                depthTest: false
            } )
        );
        this.focusMesh.position.y = 0.5;
        this.scene.add( this.focusMesh );

        var rendererEl = this.renderer.domElement;

        rendererEl.style.position = 'absolute';
        rendererEl.style.top = '0';

        this.camera.position.y = 5;
        this.camera.position.z = 10;
        this.camera.lookAt( this.scene.position );

        this.domElement.appendChild( this.stats.domElement );
        this.domElement.appendChild( rendererEl );

        this.renderer.render( this.scene, this.camera );
    },

    _createParticles: function() {
    	var settings = CONFIG.editor;

        if( this.particleGroup ) {
            this.scene.remove( this.particleGroup.mesh );
        }

        this.particleGroup = new SPE.Group( settings.group );
        this.particleEmitter = new SPE.Emitter( settings.emitter );
        this.particleGroup.addEmitter( this.particleEmitter );
        this.scene.add( this.particleGroup.mesh );
    },

    _onResize: function( e, width, height ) {
        width = width || window.innerWidth;
        height = height || window.innerHeight;

        this.renderer.setSize( width, height );
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    },

    _animate: function() {
        requestAnimationFrame( this._animate );
        this.dt = this.clock.getDelta();
        this.stats.update();
        this.renderer.render( this.scene, this.camera );
        this.particleGroup.tick( this.dt );
    },

    _updateFocusMesh: function() {
        var positionSpread = this.particleEmitter.positionSpread,
            maxAge = this.particleGroup.maxAge,
            acceleration = this.particleEmitter.acceleration,
            accelerationSpread = this.particleEmitter.accelerationSpread,
            velocity = this.particleEmitter.velocity,
            velocitySpread = this.particleEmitter.velocitySpread,

            a = new THREE.Vector3().copy( acceleration ),
            v = new THREE.Vector3().copy( velocity ),

            aSpread = new THREE.Vector3().copy( accelerationSpread ),
            vSpread = new THREE.Vector3().copy( velocitySpread ),
            scale = new THREE.Vector3();

        aSpread.divideScalar( 2 );
        vSpread.divideScalar( 2 );

        a.add( aSpread );
        v.add( vSpread );

        a.multiplyScalar( Math.pow( maxAge, 2 ) );
        v.multiplyScalar( maxAge ).add( a );

        v.x = Math.abs( v.x );
        v.y = Math.abs( v.y );
        v.z = Math.abs( v.z );

        scale.copy( v ).add( positionSpread );

        scale.x = Math.max( 1, scale.x );
        scale.y = Math.max( 1, scale.y );
        scale.z = Math.max( 1, scale.z );

        this.focusMesh.scale.copy( scale );
        this.focusMesh.position = this.particleEmitter.position;

        if( CONFIG.showGrid ) {
            this._createGrid();
        }
    },

    start: function() {
        this._animate();
    }
};
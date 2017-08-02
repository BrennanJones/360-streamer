/* global THREE */
'use strict';

class ThetaView
{
  _animate()
  {
    this._timer = requestAnimationFrame(this._animate.bind(this));
    if (this._camera === null)
    {
      return;
    }

    this._resize();
    this._update(this._clock.getDelta());
    this._render(this._clock.getDelta());
  }

  _resize()
  {
    var width = this._container.offsetWidth;
    var height = this._container.offsetHeight;
    this._camera.aspect = width / height;
    this._camera.updateProjectionMatrix();
    this._renderer.setSize(width, height);
    this._effect.setSize(width, height);
  }

  _update(dt)
  {
    this._camera.updateProjectionMatrix();
    if (this._controls)
    {
      this._controls.update(dt);
    }
  }

  _render(dt)
  {
    this._effect.render(this._scene, this._camera);
  }

  _fullscreen()
  {
    var docElm = document.documentElement;

    if (docElm.requestFullscreen)
    {
      docElm.requestFullscreen();
    }
    else if (docElm.msRequestFullscreen)
    {
      docElm.msRequestFullscreen();
    }
    else if (docElm.mozRequestFullScreen)
    {
      docElm.mozRequestFullScreen();
    }
    else if (docElm.webkitRequestFullscreen)
    {
      docElm.webkitRequestFullscreen();
    }
  }

  // Returns true if running on a mobile device.
  _detectMobile() 
  { 
    if( navigator.userAgent.match(/Android/i) ||
      navigator.userAgent.match(/webOS/i) ||
      navigator.userAgent.match(/iPhone/i) ||
      navigator.userAgent.match(/iPad/i) ||
      navigator.userAgent.match(/iPod/i) ||
      navigator.userAgent.match(/BlackBerry/i) ||
      navigator.userAgent.match(/Windows Phone/i) )
    {
      return true;
    }
    else
    {
      return false;
    }
  }

  constructor()
  {
    this._camera = null;
    this._scene = null;
    this._renderer = null;
    this._container = undefined;
    this._timer = undefined;
    this._effect = undefined;
    this._clock = undefined;
    this._isMobile = this._detectMobile();
  }

  start(videoDOM)
  {
    if (!this._container)
    {
      return;
    }
    if (this._timer)
    {
      return;
    }
    const w = this._container.clientWidth;
    const h = this._container.clientHeight;

    // Create the camera

    this._camera = new THREE.PerspectiveCamera(90, w / h, 0.1, 10000);
    this._camera.target = new THREE.Vector3(0, 0, 0);

    // Create the scene

    this._scene = new THREE.Scene();

    var videoTexture = new THREE.VideoTexture(videoDOM);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    videoTexture.format = THREE.RGBFormat;

    var cubeGeometry = new THREE.SphereGeometry(500, 60, 40);
    var sphereMat = new THREE.MeshBasicMaterial({map: videoTexture});
    sphereMat.side = THREE.FrontSide;
    var cube = new THREE.Mesh(cubeGeometry, sphereMat);
    cube.scale.x = -1;
    cube.rotation.y = Math.PI / 2;

    this._scene.add(cube);

    // Create the renderer

    this._renderer = new THREE.WebGLRenderer();
    this._renderer.setPixelRatio(window.devicePixelRatio);
    this._renderer.setSize(w, h);

    this._renderer.domElement.className += ' 360video';

    this._element = this._renderer.domElement;

    this._container.appendChild(this._element);
    const dom = videoDOM;
    dom.style.display = 'none';

    // VR stuff

    this._effect = new THREE.StereoEffect(this._renderer);
    
    if (this._isMobile)
    {
      // DEFAULT (PREFERRED)
      this._controls = new THREE.DeviceOrientationControls(this._camera, true);
      this._controls.connect();
      this._controls.update();
      this._element.addEventListener('click', this._fullscreen, false);
    }
    else
    {
      // FALLBACK
      this._controls = new THREE.OrbitControls(this._camera, this._element);
      this._controls.target.set(
        this._camera.position.x + 0.15,
        this._camera.position.y,
        this._camera.position.z
      );
      this._controls.noPan = true;
      this._controls.noZoom = true;
    }

    this._clock = new THREE.Clock();

    this._animate();
  }

  stop(videoDOM)
  {
    if (!this._timer)
    {
      return;
    }

    cancelAnimationFrame(this._timer);
    this._timer = undefined;

    const child = this._container.lastChild;
    if (child)
    {
      this._container.removeChild(child);
    }

    const dom = videoDOM;
    dom.style.display = 'inline';
  }

  setContainer(elm)
  {
    this._container = elm;
    window.onresize = () => {
      if (this._camera === null)
      {
        return;
      }

      const w = this._container.clientWidth;
      const ww = this._renderer.domElement.width;
      const hh = this._renderer.domElement.height;

      this._camera.aspect = ww / hh;
      this._camera.updateProjectionMatrix();
      this._renderer.setSize(w, w / this._camera.aspect);
    };
  }
}

//exports.ThetaView = ThetaView;

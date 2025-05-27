import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js';

const ARScene = () => {
  const containerRef = useRef();

  useEffect(() => {
    let camera, scene, renderer;
    let waterPlane;
    let hitTestSource = null;
    let hitTestSourceRequested = false;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera();

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    containerRef.current.appendChild(renderer.domElement);

    document.body.appendChild(
      ARButton.createButton(renderer, { requiredFeatures: ['hit-test'] })
    );

    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    scene.add(light);

    const waterTexture = new THREE.TextureLoader().load('/water.jpg', () => {
      waterTexture.wrapS = THREE.RepeatWrapping;
      waterTexture.wrapT = THREE.RepeatWrapping;
      waterTexture.repeat.set(4, 4);

      const material = new THREE.MeshBasicMaterial({
        map: waterTexture,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
      });

      waterPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(0.6, 0.6),
        material
      );
      waterPlane.rotation.x = -Math.PI / 2;
      waterPlane.visible = false;
      scene.add(waterPlane);
    });

    renderer.setAnimationLoop((timestamp, frame) => {
      if (frame) {
        const referenceSpace = renderer.xr.getReferenceSpace();
        const session = renderer.xr.getSession();

        if (!hitTestSourceRequested) {
          session.requestReferenceSpace('viewer').then((refSpace) => {
            session.requestHitTestSource({ space: refSpace }).then((source) => {
              hitTestSource = source;
            });
          });

          session.addEventListener('end', () => {
            hitTestSourceRequested = false;
            hitTestSource = null;
          });

          hitTestSourceRequested = true;
        }

        if (hitTestSource) {
          const hitTestResults = frame.getHitTestResults(hitTestSource);
          if (hitTestResults.length > 0) {
            const hit = hitTestResults[0];
            const pose = hit.getPose(referenceSpace);

            if (waterPlane) {
              waterPlane.visible = true;
              waterPlane.position.set(
                pose.transform.position.x,
                pose.transform.position.y,
                pose.transform.position.z
              );
            }
          }
        }
      }

      renderer.render(scene, camera);
    });

    return () => {
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return <div ref={containerRef} />;
};

export default ARScene;

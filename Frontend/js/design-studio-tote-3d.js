import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
// DecalGeometry import removed; not used.


const mockup = document.getElementById("studioProductMockup");
if(!mockup){
  throw new Error("SELFII Design Studio: Product mockup container was not found.");
}

const toteViewerElement = document.createElement("div");
toteViewerElement.id = "studio3DToteViewer";
toteViewerElement.hidden = true;
toteViewerElement.setAttribute("aria-label", "Interactive 3D tote bag preview");
Object.assign(toteViewerElement.style, {
  width: "100%",
  height: "520px",
  minHeight: "420px",
  position: "relative",
  display: "none"
});

const toteStatusElement = document.createElement("div");
toteStatusElement.id = "studio3DToteStatus";
toteStatusElement.textContent = "Loading tote bag...";
Object.assign(toteStatusElement.style, {
  position: "absolute",
  left: "12px",
  bottom: "10px",
  zIndex: "2",
  color: "#fff",
  fontSize: "12px",
  background: "rgba(32,35,42,.8)",
  padding: "8px 10px",
  borderRadius: "5px",
  pointerEvents: "none"
});
toteViewerElement.appendChild(toteStatusElement);

const frameViewer = document.getElementById("studio3DFrameViewer");
if(frameViewer){
  frameViewer.insertAdjacentElement("afterend", toteViewerElement);
}else{
  mockup.appendChild(toteViewerElement);
}

const viewer=document.getElementById("studio3DToteViewer");
const status=document.getElementById("studio3DToteStatus");

const scene=new THREE.Scene();
scene.background=new THREE.Color(0xececec);

const camera=new THREE.PerspectiveCamera(35,viewer.clientWidth/viewer.clientHeight,0.01,100);
camera.position.set(0,0.3,1.5);

const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.15;
viewer.appendChild(renderer.domElement);

const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;

scene.add(new THREE.HemisphereLight(0xffffff,0x777777,2));
const key=new THREE.DirectionalLight(0xffffff,3);
key.position.set(2,4,5);
scene.add(key);
const fill=new THREE.DirectionalLight(0xffffff,1.5);
fill.position.set(-3,2,-3);
scene.add(fill);

let tote=null;
let canvasMaterials=[];
let toteBody=null;
let pendingArtworkSource=null;
let managedArtworkURL=null;
let currentTexture=null;
let artworkDecals=[];
let originalCameraPosition=null;
let originalTarget=null;





function applyArtwork(source){
  if(!toteBody || !canvasMaterials.length){
    status.textContent="Tote canvas is not ready yet";
    return;
  }

  new THREE.TextureLoader().load(source,texture=>{
    texture.colorSpace=THREE.SRGBColorSpace;
    texture.flipY=true;
    texture.anisotropy=renderer.capabilities.getMaxAnisotropy();

    if(currentTexture)currentTexture.dispose();
    currentTexture=texture;

    // Remove any previous front/back print meshes.
    artworkDecals.forEach(mesh=>{
      toteBody.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
    });
    artworkDecals=[];

    const sourceGeometry=toteBody.geometry;
    const materials=Array.isArray(toteBody.material)
      ? toteBody.material
      : [toteBody.material];

    const canvasIndex=materials.indexOf(canvasMaterials[0]);
    const groups=sourceGeometry.groups.length
      ? sourceGeometry.groups
      : [{start:0,count:sourceGeometry.index
          ? sourceGeometry.index.count
          : sourceGeometry.attributes.position.count,
         materialIndex:canvasIndex}];

    const canvasGroup=groups.find(g=>g.materialIndex===canvasIndex);

    if(!canvasGroup){
      status.textContent="Could not isolate cotton canvas geometry";
      console.error("Canvas material group not found",groups,canvasIndex);
      return;
    }

    const geometry=sourceGeometry.index
      ? sourceGeometry.toNonIndexed()
      : sourceGeometry;

    const positions=geometry.attributes.position;
    const selected=[];
    let minX=Infinity,maxX=-Infinity;
    let minY=Infinity,maxY=-Infinity;
    let selectedTriangles=0;

    const start=canvasGroup.start;
    const end=start+canvasGroup.count;

    // Keep only triangles whose faces point mainly toward the
    // front or back of the tote. Side gussets are excluded.
    for(let i=start;i<end;i+=3){
      const ax=positions.getX(i);
      const ay=positions.getY(i);
      const az=positions.getZ(i);
      const bx=positions.getX(i+1);
      const by=positions.getY(i+1);
      const bz=positions.getZ(i+1);
      const cx=positions.getX(i+2);
      const cy=positions.getY(i+2);
      const cz=positions.getZ(i+2);

      const abx=bx-ax, aby=by-ay, abz=bz-az;
      const acx=cx-ax, acy=cy-ay, acz=cz-az;

      const nx=aby*acz-abz*acy;
      const ny=abz*acx-abx*acz;
      const nz=abx*acy-aby*acx;
      const length=Math.hypot(nx,ny,nz)||1;

      if(Math.abs(nz/length)<0.65)continue;

      const cyCenter=(ay+by+cy)/3;
      if(cyCenter<0.035)continue;

      const triangle=[
        [ax,ay,az],
        [bx,by,bz],
        [cx,cy,cz]
      ];

      triangle.forEach(v=>{
        selected.push(v);
        minX=Math.min(minX,v[0]);
        maxX=Math.max(maxX,v[0]);
        minY=Math.min(minY,v[1]);
        maxY=Math.max(maxY,v[1]);
      });

      selectedTriangles++;
    }

    if(!selectedTriangles){
      status.textContent="No front/back canvas faces detected";
      console.error("No suitable triangles found",canvasGroup);
      return;
    }

    const printGeometry=new THREE.BufferGeometry();
    const vertexPositions=[];
    const uvs=[];

    selected.forEach(v=>{
      vertexPositions.push(v[0],v[1],v[2]);
      uvs.push(
        (v[0]-minX)/(maxX-minX),
        (v[1]-minY)/(maxY-minY)
      );
    });

    printGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertexPositions,3)
    );
    printGeometry.setAttribute(
      "uv",
      new THREE.Float32BufferAttribute(uvs,2)
    );
    printGeometry.computeVertexNormals();

    const printMaterial=new THREE.MeshStandardMaterial({
      map:texture,
      transparent:true,
      roughness:0.9,
      metalness:0,
      polygonOffset:true,
      polygonOffsetFactor:-2,
      polygonOffsetUnits:-2,
      side:THREE.DoubleSide
    });

    const printMesh=new THREE.Mesh(printGeometry,printMaterial);
    printMesh.renderOrder=3;
    printMesh.frustumCulled=false;

    toteBody.add(printMesh);
    artworkDecals.push(printMesh);

    status.textContent="Artwork applied to front and back panels";
    console.log("TOTE FRONT/BACK PRINT:",{
      triangles:selectedTriangles,
      width:maxX-minX,
      height:maxY-minY
    });
  },undefined,error=>{
    console.error(error);
    status.textContent="Could not load artwork";
  });
}

new GLTFLoader().load(
  '../assets/models/tote-bag/tote-bag.glb',
  gltf=>{
    tote=gltf.scene;
    scene.add(tote);

    const toteMeshes=[];
    tote.traverse(object=>{
      if(!object.isMesh)return;
      toteMeshes.push(object);
      object.castShadow=true;
      object.receiveShadow=true;
    });

    const cleanName=value=>(value||"").toLowerCase().replace(/[^a-z0-9]/g,"");
    const getMaterials=object=>Array.isArray(object.material)
      ? object.material
      : object.material?[object.material]:[];

    toteBody=toteMeshes.find(object=>cleanName(object.name).includes("totebody"))
      || toteMeshes.find(object=>getMaterials(object).some(material=>{
        const name=cleanName(material?.name);
        return name.includes("naturalcottoncanvas") || (name.includes("cotton") && name.includes("canvas"));
      }))
      || toteMeshes.find(object=>getMaterials(object).some(material=>cleanName(material?.name).includes("canvas")));

    canvasMaterials=[];

    if(toteBody){
      const bodyMaterials=getMaterials(toteBody);
      let canvasIndex=bodyMaterials.findIndex(material=>{
        const name=cleanName(material?.name);
        return name.includes("naturalcottoncanvas") || (name.includes("cotton") && name.includes("canvas"));
      });

      if(canvasIndex<0)
        canvasIndex=bodyMaterials.findIndex(material=>cleanName(material?.name).includes("canvas"));

      if(canvasIndex<0 && bodyMaterials.length>1)canvasIndex=0;

      if(canvasIndex>=0){
        const updated=bodyMaterials[canvasIndex].clone();
        updated.map=null;
        updated.color.set(0xffffff);
        updated.needsUpdate=true;
        bodyMaterials[canvasIndex]=updated;

        if(Array.isArray(toteBody.material))
          toteBody.material=bodyMaterials;
        else
          toteBody.material=updated;

        canvasMaterials=[updated];
      }
    }

    console.log("TOTE DETECTION:",{
      meshes:toteMeshes.map(object=>({
        name:object.name,
        materials:getMaterials(object).map(material=>material?.name)
      })),
      body:toteBody?.name || null,
      canvas:canvasMaterials.map(material=>material.name)
    });

    const bounds=new THREE.Box3().setFromObject(tote);
    const center=bounds.getCenter(new THREE.Vector3());
    const size=bounds.getSize(new THREE.Vector3());
    tote.position.sub(center);

    const maxDimension=Math.max(size.x,size.y,size.z);
    camera.position.set(0,maxDimension*0.25,maxDimension*2.8);
    camera.near=maxDimension/100;
    camera.far=maxDimension*100;
    camera.updateProjectionMatrix();

    controls.target.set(0,0,0);
    controls.minDistance=maxDimension*1.1;
    controls.maxDistance=maxDimension*6;
    controls.update();

    originalCameraPosition=camera.position.clone();
    originalTarget=controls.target.clone();

    status.textContent=canvasMaterials.length
      ? "Tote bag loaded — upload artwork"
      : "Model loaded, but cotton canvas material was not found";

    if(pendingArtworkSource && canvasMaterials.length){
      applyArtwork(pendingArtworkSource);
    }

    if(!canvasMaterials.length)console.warn('Canvas material not found. Check material names.');
    console.log('Canvas materials found:',canvasMaterials.length);
    console.log('Tote dimensions:',size);
  },
  undefined,
  error=>{
    console.error(error);
    status.textContent="Could not load tote model — check console";
  }
);


async function capturePreview(){
  if(!tote || !renderer) return null;

  await new Promise(resolve =>
    requestAnimationFrame(() =>
      requestAnimationFrame(resolve)
    )
  );

  resize();

  if(!viewer.clientWidth || !viewer.clientHeight) return null;

  controls.update();
  renderer.render(scene,camera);

  return renderer.domElement.toDataURL("image/png");
}

window.SELFII_3D_TOTE = {
  capturePreview,

  setVisible(visible){
    viewer.hidden = !visible;
    viewer.style.display = visible ? "block" : "none";
    if(visible) resize();
  },

  setArtwork(source){
    if(!source) return;

    pendingArtworkSource = source;

    if(managedArtworkURL){
      URL.revokeObjectURL(managedArtworkURL);
      managedArtworkURL = null;
    }

    let artworkSource = source;

    if(source instanceof Blob){
      managedArtworkURL = URL.createObjectURL(source);
      artworkSource = managedArtworkURL;
    }

    pendingArtworkSource = artworkSource;

    if(toteBody && canvasMaterials.length){
      applyArtwork(artworkSource);
    }
  },

  reset(){
    if(!originalCameraPosition) return;
    camera.position.copy(originalCameraPosition);
    controls.target.copy(originalTarget);
    controls.update();
  }
};

function resize(){
  const w=viewer.clientWidth;
  const h=viewer.clientHeight;
  if(!w || !h) return;
  camera.aspect=w/h;
  camera.updateProjectionMatrix();
  renderer.setSize(w,h);
}
new ResizeObserver(resize).observe(viewer);
resize();

function animate(){
  requestAnimationFrame(animate);

  if(!viewer.hidden && viewer.clientWidth > 0 && viewer.clientHeight > 0){
    controls.update();
    renderer.render(scene,camera);
  }
}
animate();
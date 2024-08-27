// const config = {
//   url: "/static/1722303090354.png",
//   minElevation: 1801,
//   maxElevation: 3854,
//   extent: [120.9209243524, 23.38471481, 120.9953789709, 23.4513001144],
// };
let viewer;
let floodViewer = null;
let blueWall = null;
let wallPositions = [];
let recordPos = [];
const config = {
  url: "../../assets/image/flood/floodMock.png",
  minElevation: 0, // 最低高程 这个使用getImage会自行获取
  maxElevation: 10, // 最高高程 这个使用getImage会自行获取
  extent: createSquareRectangle(112.8852285762, 23.3527331088, 5000), // 矩形范围
};
const extent = config.extent;

const colorOptions = {
  // 浅水区颜色
  shallowColor: "#d34917",
  // 深水区颜色
  deepColor: "#d34917",
};

const options = {
  // message: "流体参数",
  waterAddRate: 0.001,
  waterSourceRadius: 0.03,
  attenuation: 0.995,
  strenght: 0.2,
  minTotalFlow: 0.0001,
  initialWaterLevel: 0,
  depth: 180, // 光线步进次数 控制渲染质量
  shallow: new window.Cesium.Color.fromCssColorString(
    colorOptions.shallowColor
  ), //浅水区颜色
  deep: new window.Cesium.Color.fromCssColorString(colorOptions.deepColor), // 深水区颜色
  waterAlpha: 1.0, // 水流透明度
  damStart: new window.Cesium.Cartesian2(0.8, 0), // 水闸位置起点
  damEnd: new window.Cesium.Cartesian2(1.0, 0.2), // 水闸位置终点
  damHeight: 0.0, // 水闸高度
  setDam: false, // 是否设置闸门
  evaporationRate: 0.0, //水流蒸发率
  evoluteCenterPick: () => {
    console.log("选取中心点");
  },
  evoluteSideLength: 5000, // 区域边长
  start: () => {
    let dom = document
      .querySelector(".custom-class-start")
      .parentNode.querySelector("span");
    if (dom.innerText == "开始模拟") {
      initViewer();
      dom.innerText = "结束模拟";
    } else {
      if (floodViewer) {
        floodViewer.destroyShaderToy();
      }
      dom.innerText = "开始模拟";
    }
  },
  close: () => {
    let dom = document
      .querySelector(".custom-class-start")
      .parentNode.querySelector("span");
    if (floodViewer) {
      floodViewer.destroyShaderToy();
      dom.innerText = "开始模拟";
    }
    // 隐藏界面
    changeGuiShow(false);
  },
};

// gui控制器
const gui = new dat.GUI();
// 设置样式
gui.domElement.style.position = "absolute";
gui.domElement.style.left = "16.5vw";
gui.domElement.style.top = "11.5vh";
gui.domElement.onmousedown = function (Event) {
  Event = Event || window.Event;
  // 获取滑块偏移量
  var left = Event.clientX - gui.domElement.offsetLeft;
  var top = Event.clientY - gui.domElement.offsetTop;
  if (Event.target.className === "property-name") {
    document.onmousemove = function (event) {
      event = event || window.event;
      gui.domElement.style.left = event.clientX - left + "px";
      gui.domElement.style.top = event.clientY - top + "px";
    };
  }
  document.onmouseup = function () {
    document.onmousemove = null;
    document.onmouseup = null;
  };
  Event.preventDefault();
  // return false
};

// 创建一个文件夹来添加参数
let folder0 = gui.addFolder("演进区域参数");
let folder = gui.addFolder("洪水流体参数");
let folder2 = gui.addFolder("水闸参数");
folder0
  .add(options, "evoluteCenterPick")
  .name("选取中心点")
  .domElement.parentNode.querySelector("span").style.textAlign = "center";
folder0.add(options, "evoluteSideLength", 500, 5000).name("区域边长");
folder0.open();

// 设置流体属性值
// gui.add(options, "message");
folder.add(options, "waterAddRate", 0.001, 0.01).name("水流增加速率");
folder.add(options, "waterSourceRadius", 0.005, 0.5).name("水流水源半径");
folder.add(options, "attenuation", 0, 1).name("衰减控制水波");
folder.add(options, "strenght", 0, 1).name("强度扰动");
folder.add(options, "minTotalFlow", 0.00005, 0.0003).name("最小水流");
folder.add(options, "initialWaterLevel", 0, 1).name("最初水平面");
folder.add(options, "depth", 50, 500).name("光线步进次数");
folder.add(options, "evaporationRate", 0.0, 0.001).name("水流蒸发率");
folder.add(options, "waterAlpha", 0.001, 1.0).name("水流透明度");
folder
  .addColor(colorOptions, "shallowColor")
  .onFinishChange((value) => {
    options.shallow = window.Cesium.Color.fromCssColorString(value);
  })
  .name("浅水区颜色")
  .domElement.querySelector("input").style.height = "100%";
folder
  .addColor(colorOptions, "deepColor")
  .onFinishChange((value) => {
    options.deep = window.Cesium.Color.fromCssColorString(value);
  })
  .name("深水区颜色")
  .domElement.querySelector("input").style.height = "100%";
folder.open();
folder2.add(options, "damHeight", 0.0, 10.0).name("水闸高度");
folder2.add(options, "setDam").name("是否绘制水闸");
folder2.open();
gui
  .add(options, "start")
  .name("开始模拟")
  .domElement.classList.add("custom-class-start");
gui
  .add(options, "close")
  .name("关闭")
  .domElement.parentNode.querySelector("span").style.textAlign = "center";

document
  .querySelector(".custom-class-start")
  .parentNode.querySelector("span").style.textAlign = "center";
// 隐藏界面
changeGuiShow(false);

// 显隐界面
export function changeGuiShow(showGui) {
  if (showGui) {
    gui.domElement.style.display = "block";
  } else {
    gui.domElement.style.display = "none";
  }
}
// 销毁模拟实例（盒子、洪水）
// export function destroyViewer() {
//   this._viewer.scene.primitives.remove(Buffer_A);
//   this._viewer.scene.primitives.remove(Buffer_B);
//   this._viewer.scene.primitives.remove(Buffer_C);
//   this._viewer.scene.primitives.remove(Buffer_D);
//   this._viewer.scene.primitives.remove(fluidCommand);
// }

function calculateNormalizedPosition(clickedPosition, extent) {
  // 确保extent是正确的格式：[minLon, minLat, maxLon, maxLat]
  const [minLon, minLat, maxLon, maxLat] = extent;

  // 获取点击位置的经纬度
  const cartographic =
    window.Cesium.Cartographic.fromCartesian(clickedPosition);
  const lon = window.Cesium.Math.toDegrees(cartographic.longitude);
  const lat = window.Cesium.Math.toDegrees(cartographic.latitude);

  // 计算归一化坐标
  const x = (lon - minLon) / (maxLon - minLon);
  const y = (lat - minLat) / (maxLat - minLat);

  return { x, y };
}
function drawWall() {
  blueWall = viewer.entities.add({
    name: "Blue wall with sawtooth heights and outline",
    wall: {
      positions: new window.Cesium.CallbackProperty(() => {
        return window.Cesium.Cartesian3.fromDegreesArray(wallPositions);
      }, false),
      maximumHeights: [config.minElevation, config.minElevation],
      minimumHeights: new window.Cesium.CallbackProperty(() => {
        const height =
          (config.maxElevation - config.minElevation) * options.damHeight;
        const res = [
          config.minElevation + height,
          config.minElevation + height,
        ];
        return res;
      }, false),
      // material: window.Cesium.Color.fromCssColorString(
      //   colorOptions.shallowColor
      // ),
      material: window.Cesium.Color.fromCssColorString("#FFFFFFFF"),
      outline: false,
      outlineColor: window.Cesium.Color.BLACK,
    },
  });
}
function getDamPos(lon, lat) {
  const [minLon, minLat, maxLon, maxLat] = extent;
  const x = (lon - minLon) / (maxLon - minLon);
  const y = 1 - (lat - minLat) / (maxLat - minLat);
  return new window.Cesium.Cartesian2(x, y);
}
function updateDamPos() {
  options.damStart = getDamPos(wallPositions[0], wallPositions[1]);
  options.damEnd = getDamPos(wallPositions[2], wallPositions[3]);
}
function createSquareRectangle(centerLon, centerLat, sideLength) {
  // 将边长转换为度
  const earthRadius = 6371000; // 地球平均半径，单位：米
  const angularDistance = (sideLength / earthRadius) * (180 / Math.PI); // 计算经度差

  const lonDiff = angularDistance / Math.cos((centerLat * Math.PI) / 180); // 计算矩形的边界

  const west = centerLon - lonDiff / 2;
  const east = centerLon + lonDiff / 2;
  const south = centerLat - angularDistance / 2;
  const north = centerLat + angularDistance / 2; // 返回[west, south, east, north]格式的数组

  return [west, south, east, north];
}

/**
 * 初始化viewer
 */
export const initViewer = async () => {
  //   window.Cesium.Ion.defaultAccessToken =
  //     "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxZDcyMDViMi04YjI0LTQ4YjAtOTY4Yi04ZDY3MmFkYzg1NzkiLCJpZCI6MTM3MDM2LCJpYXQiOjE2ODM0MjMwOTB9.EKgqrUj5yf9JZ1CghT85i1FkT04M2d2g568Hy5bhzt0";

  //   viewer = new window.Cesium.Viewer("cesiumContainer", {
  //     terrainProvider: window.Cesium.createWorldTerrain({
  //       requestVertexNormals: true,
  //     }),
  //   });
  viewer = window?.earth.czm.viewer;
  viewer.scene.msaaSamples = 4;
  viewer.scene.highDynamicRange = true;
  viewer.postProcessStages.fxaa.enabled = true;
  viewer.scene.globe.depthTestAgainstTerrain = true;
  viewer.scene.debugShowFramesPerSecond = true;

  const rectangle = window.Cesium.Rectangle.fromDegrees(...extent);

  viewer.camera.flyTo({
    destination: rectangle,
    duration: 1.0,
  });

  const heightMap = await getImageSource(viewer); // getImage
  // 初始化流体Demo
  // const fluid = new FluidDemo(viewer, heightMap);
  floodViewer = new FluidDemo(viewer, heightMap);
  viewer.screenSpaceEventHandler.setInputAction(function (movement) {
    const pickedPosition = viewer.scene.pickPosition(movement.position);
    if (window.Cesium.defined(pickedPosition)) {
      // const extent = [...extent];
      if (options.setDam) {
        if (recordPos.length >= 4) {
          return;
        } else {
          const cartographic =
            window.Cesium.Cartographic.fromCartesian(pickedPosition);
          const lon = window.Cesium.Math.toDegrees(cartographic.longitude);
          const lat = window.Cesium.Math.toDegrees(cartographic.latitude);
          recordPos.push(lon, lat);
          if (recordPos.length === 4) {
            wallPositions = [...recordPos];
            blueWall || drawWall();
            recordPos = [];
            updateDamPos();
          }
        }
      } else {
        const normalizedPosition = calculateNormalizedPosition(
          pickedPosition,
          extent
        );

        // console.log(
        //   `Normalized position: (${normalizedPosition.x.toFixed(
        //     4
        //   )}, ${normalizedPosition.y.toFixed(4)})`
        // );

        // 如果你需要将坐标中心点调整为(0.5, 0.5)，可以这样做：
        const centeredX = normalizedPosition.x;
        const centeredY = 1 - normalizedPosition.y; // 注意这里需要反转Y轴
        floodViewer.setWaterPos(
          new window.Cesium.Cartesian2(centeredX, centeredY)
        );
        // console.log(
        //   `Centered position: (${centeredX.toFixed(4)}, ${centeredY.toFixed(4)})`
        // );
      }
    }
  }, window.Cesium.ScreenSpaceEventType.LEFT_CLICK);

  // 显示界面
  // gui.domElement.style.display = "block";
  changeGuiShow(true);
};

// 公共变量
const Command = `
uniform vec2 waterSource; // 水源位置,可以根据需要调整
uniform float waterSourceRadius; // 水源半径
uniform float waterAddRate; // 每帧增加的水量
uniform float evaporationRate; // 水的蒸发率
const int textureSize = 1024;
// Render
const vec3 backgroundColor = vec3(0.2);
// Terrain
const float transitionTime = 5.0;
const float transitionPercent = 0.3;
const int octaves = 7;
// Water simulation
uniform float attenuation;
uniform float strenght;
uniform float minTotalFlow;
uniform float initialWaterLevel;

mat2 rot(in float ang) 
{
  return mat2(
           cos(ang), -sin(ang),
           sin(ang),  cos(ang));
}

// hash from Dave_Hoskins https://www.shadertoy.com/view/4djSRW
float hash12(vec2 p)
{
   vec3 p3  = fract(vec3(p.xyx) * .1031);
   p3 += dot(p3, p3.yzx + 33.33);
   return fract((p3.x + p3.y) * p3.z);
}

float hash13(vec3 p3)
{
   p3  = fract(p3 * .1031);
   p3 += dot(p3, p3.zyx + 31.32);
   return fract((p3.x + p3.y) * p3.z);
}

// Box intersection by IQ https://iquilezles.org/articles/boxfunctions

vec2 boxIntersection( in vec3 ro, in vec3 rd, in vec3 rad, out vec3 oN ) 
{
   vec3 m = 1.0 / rd;
   vec3 n = m * ro;
   vec3 k = abs(m) * rad;
   vec3 t1 = -n - k;
   vec3 t2 = -n + k;

   float tN = max( max( t1.x, t1.y ), t1.z );
   float tF = min( min( t2.x, t2.y ), t2.z );
   
   if( tN > tF || tF < 0.0) return vec2(-1.0); // no intersection
   
   oN = -sign(rd)*step(t1.yzx, t1.xyz) * step(t1.zxy, t1.xyz);

   return vec2( tN, tF );
}

vec2 hitBox(vec3 orig, vec3 dir) {
   const vec3 box_min = vec3(-0.5);
   const vec3 box_max = vec3(0.5);
   vec3 inv_dir = 1.0 / dir;
   vec3 tmin_tmp = (box_min - orig) * inv_dir;
   vec3 tmax_tmp = (box_max - orig) * inv_dir;
   vec3 tmin = min(tmin_tmp, tmax_tmp);
   vec3 tmax = max(tmin_tmp, tmax_tmp);
   float t0 = max(tmin.x, max(tmin.y, tmin.z));
   float t1 = min(tmax.x, min(tmax.y, tmax.z));
   return vec2(t0, t1);
}

// Fog by IQ https://iquilezles.org/articles/fog

vec3 applyFog( in vec3  rgb, vec3 fogColor, in float distance)
{
   float fogAmount = exp( -distance );
   return mix( fogColor, rgb, fogAmount );
}
`;

// 计算地形和更新水位pass 1
const BufferA = `
// compute Terrain and update water level 1st pass
uniform sampler2D iChannel0;
uniform sampler2D iChannel1;
uniform sampler2D heightMap;
uniform float iTime;
uniform int iFrame;
uniform vec2 damStart;  // 水坝起点
uniform vec2 damEnd;    // 水坝终点
uniform float damHeight;  // 水坝高度
float boxNoise( in vec2 p, in float z )
{
   vec2 fl = floor(p);
   vec2 fr = fract(p);
   fr = smoothstep(0.0, 1.0, fr);    
   float res = mix(mix( hash13(vec3(fl, z)),             hash13(vec3(fl + vec2(1,0), z)),fr.x),
                   mix( hash13(vec3(fl + vec2(0,1), z)), hash13(vec3(fl + vec2(1,1), z)),fr.x),fr.y);
   return res;
}

vec2 readHeight(vec2 p)
{
   p = clamp(p, vec2(0.0), vec2(float(textureSize - 1)));
   return texture2D(iChannel0, p / float(textureSize)).xy;
} 

vec4 readOutFlow(vec2 p)
{
   if(p.x < 0.0 || p.y < 0.0 || p.x >= float(textureSize) || p.y >= float(textureSize))
       return vec4(0.0);
   return texture2D(iChannel1, p / float(textureSize));
}
   
bool intersectsDam(vec2 uv) {
    vec2 damDir = damEnd - damStart;
    vec2 pointDir = uv - damStart;
    float t = clamp(dot(pointDir, damDir) / dot(damDir, damDir), 0.0, 1.0);
    vec2 closestPoint = damStart + t * damDir;
    float dist = length(uv - closestPoint);
    return dist < 0.001;  // 可以根据需要调整这个阈值
}

void main( )
{
   // Outside ?
   if( max(gl_FragCoord.x, gl_FragCoord.y) > float(textureSize) )
       discard;
          
   // Terrain
   vec2 uv = gl_FragCoord.xy / float(textureSize);
   float t = transitionTime;
  
   float terrainElevation = texture2D(heightMap,uv).r;

   // 增加水坝
   if (intersectsDam(uv)) {
        terrainElevation = max(terrainElevation, damHeight);  // 水坝高度从最底部开始计算
    }

// float terrainElevation =0.0;
   // Water
   float waterDept = initialWaterLevel;
   if(iFrame != 0)
   {
        vec2 p = gl_FragCoord.xy;
        vec2 height = readHeight(p);
        vec4 OutFlow = texture2D(iChannel1, p / float(textureSize));
        float totalOutFlow = OutFlow.x + OutFlow.y + OutFlow.z + OutFlow.w;
        float totalInFlow = 0.0;
        totalInFlow += readOutFlow(p + vec2( 1.0,  0.0)).z;
        totalInFlow += readOutFlow(p + vec2( 0.0,  1.0)).w;
        totalInFlow += readOutFlow(p + vec2(-1.0,  0.0)).x;
        totalInFlow += readOutFlow(p + vec2( 0.0, -1.0)).y;
        waterDept = height.y - totalOutFlow + totalInFlow;
        if(distance(uv, waterSource) < waterSourceRadius) {
            waterDept += waterAddRate;
        }
        waterDept = max(0.0, waterDept - evaporationRate);// 让水蒸发
   }
   gl_FragColor = vec4(terrainElevation, waterDept, 0, 1);
}
`;

// 更新水流量pass
const BufferB = `
// Update Outflow 1st pass
uniform sampler2D iChannel0;
uniform sampler2D iChannel1;
uniform float     iTime;
uniform int     iFrame;
vec2 readHeight(vec2 p)
{
   p = clamp(p, vec2(0.0), vec2(float(textureSize - 1)));
   return texture2D(iChannel0, p / float(textureSize)).xy;
} 

float computeOutFlowDir(vec2 centerHeight, vec2 pos)
{
   vec2 dirHeight = readHeight(pos);
   if(distance(pos / float(textureSize), waterSource) < waterSourceRadius) {
        return max(0.0, centerHeight.y - dirHeight.y);
    }
   return max(0.0, (centerHeight.x + centerHeight.y) - (dirHeight.x + dirHeight.y));
}

void main()
{
   vec2 p = gl_FragCoord.xy;
   // Init to zero at frame 0
   if(iFrame == 0)
   {
       gl_FragColor = vec4(0);
       return;
   }    
   
   // Outside ?
   if( max(p.x, p.y) > float(textureSize) )
       discard;
       
   
      vec4 oOutFlow = texture2D(iChannel1, p / float(textureSize));
   vec2 height = readHeight(p);
   vec4 nOutFlow;        
   nOutFlow.x = computeOutFlowDir(height, p + vec2( 1.0,  0.0));
   nOutFlow.y = computeOutFlowDir(height, p + vec2( 0.0,  1.0));
   nOutFlow.z = computeOutFlowDir(height, p + vec2(-1.0,  0.0));
   nOutFlow.w = computeOutFlowDir(height, p + vec2( 0.0, -1.0));
   nOutFlow = attenuation * oOutFlow + strenght * nOutFlow;
   float totalFlow = nOutFlow.x + nOutFlow.y + nOutFlow.z + nOutFlow.w;
   if(totalFlow > minTotalFlow)
   {
       if(height.y < totalFlow)
       {
           nOutFlow = nOutFlow * (height.y / totalFlow);
       }
   }
   else
   {
       nOutFlow = vec4(0);
   }


   gl_FragColor = nOutFlow;
}
`;

// 水位计算pass2
const BufferC = `
// water level 2nd pass
uniform sampler2D iChannel0;
uniform sampler2D iChannel1;
uniform float iTime;
uniform int iFrame;
vec2 readHeight(vec2 p)
{
   p = clamp(p, vec2(0.0), vec2(float(textureSize - 1)));
   return texture2D(iChannel0, p / float(textureSize)).xy;
} 

vec4 readOutFlow(vec2 p)
{
   if(p.x < 0.0 || p.y < 0.0 || p.x >= float(textureSize) || p.y >= float(textureSize))
       return vec4(0.0);
   return texture2D(iChannel1, p / float(textureSize));
} 


void main( )
{
   // Outside ?
   if( max(gl_FragCoord.x, gl_FragCoord.y) > float(textureSize) )
       discard;
          
   // Water
   vec2 p = gl_FragCoord.xy;
   vec2 height = readHeight(p);
   vec4 OutFlow = texture2D(iChannel1, p / float(textureSize));
   float totalOutFlow = OutFlow.x + OutFlow.y + OutFlow.z + OutFlow.w;
   float totalInFlow = 0.0;
   totalInFlow += readOutFlow(p + vec2( 1.0,  0.0)).z;
   totalInFlow += readOutFlow(p + vec2( 0.0,  1.0)).w;
   totalInFlow += readOutFlow(p + vec2(-1.0,  0.0)).x;
   totalInFlow += readOutFlow(p + vec2( 0.0, -1.0)).y;
   float waterDept = height.y - totalOutFlow + totalInFlow;
   if(distance(gl_FragCoord.xy, waterSource) < waterSourceRadius) {
        waterDept = max(waterDept, initialWaterLevel + waterAddRate);
    }
         waterDept = max(0.0, waterDept - evaporationRate);// 让水蒸发
   gl_FragColor = vec4(height.x, waterDept, 0, 1);
}
`;

// 水流量计算pass2
const BufferD = `
// Update Outflow 2nd pass
uniform sampler2D iChannel0;
uniform sampler2D iChannel1;
uniform float iTime;
uniform int iFrame;
vec2 readHeight(vec2 p)
{
   p = clamp(p, vec2(0.0), vec2(float(textureSize - 1)));
   return texture2D(iChannel0, p / float(textureSize)).xy;
} 

float computeOutFlowDir(vec2 centerHeight, vec2 pos)
{
   vec2 dirHeight = readHeight(pos);
   if(distance(pos / float(textureSize), waterSource) < waterSourceRadius) {
        return max(0.0, centerHeight.y - dirHeight.y);
    }
   return max(0.0, (centerHeight.x + centerHeight.y) - (dirHeight.x + dirHeight.y));
}


void main( )
{
   vec2 p = gl_FragCoord.xy;
   
   // Outside ?
   if( max(p.x, p.y) > float(textureSize) )
       discard;
       
   
      vec4 oOutFlow = texture2D(iChannel1, p / float(textureSize));
   vec2 height = readHeight(p);
   vec4 nOutFlow;        
   nOutFlow.x = computeOutFlowDir(height, p + vec2( 1.0,  0.0));
   nOutFlow.y = computeOutFlowDir(height, p + vec2( 0.0,  1.0));
   nOutFlow.z = computeOutFlowDir(height, p + vec2(-1.0,  0.0));
   nOutFlow.w = computeOutFlowDir(height, p + vec2( 0.0, -1.0));
   nOutFlow = attenuation * oOutFlow + strenght * nOutFlow;
   float totalFlow = nOutFlow.x + nOutFlow.y + nOutFlow.z + nOutFlow.w;
   if(totalFlow > minTotalFlow)
   {
       if(height.y < totalFlow)
       {
           nOutFlow = nOutFlow * (height.y / totalFlow);
       }
   }
   else
   {
       nOutFlow = vec4(0);
   }


   gl_FragColor = nOutFlow;
}
`;
const renderShaderSource = `
uniform vec2 damStart;  // 水坝起点
uniform vec2 damEnd;    // 水坝终点
uniform float damHeight;  // 水坝高度
uniform vec3 shallow;
uniform vec3 deep;
uniform sampler2D iChannel0;
uniform vec2 iResolution;
uniform float iTime;
uniform int iFrame;
uniform int depth;
uniform float waterAlpha;
varying vec3 vo;
varying vec3 vd;
varying vec2 v_st;
const vec3 light = vec3(0.,4.,2.);
const float boxHeight = .5;
const float terrainTransparency = 0.0;

bool intersectsDam(vec2 uv) {
    vec2 damDir = damEnd - damStart;
    vec2 pointDir = uv - damStart;
    float t = clamp(dot(pointDir, damDir) / dot(damDir, damDir), 0.0, 1.0);
    vec2 closestPoint = damStart + t * damDir;
    float dist = length(uv - closestPoint);
    return dist < 0.001;  // 可以根据需要调整这个阈值
}

vec2 getHeight(in vec3 p)
{
    vec2 uv = p.xz + 0.5;
    uv = clamp(uv, 0.0, 1.0);
    vec2 h = texture2D(iChannel0, uv).xy;
    h.y += h.x;
    return h - 0.5;
} 

vec3 getNormal(in vec3 p, int comp)
{
    float d = 2.0 / float(textureSize);
    float hMid = 0.0;
    float hRight = 0.0;
    float hTop = 0.0;

    vec2 heightMid = getHeight(p);
    vec2 heightRight = getHeight(p + vec3(d, 0.0, 0.0));
    vec2 heightTop = getHeight(p + vec3(0.0, 0.0, d));

    if (comp == 0) {
        hMid = heightMid.x;
        hRight = heightRight.x;
        hTop = heightTop.x;
    } else if (comp == 1) {
        hMid = heightMid.y;
        hRight = heightRight.y;
        hTop = heightTop.y;
    }

    return normalize(cross(vec3(0.0, hTop - hMid, d), vec3(d, hRight - hMid, 0.0)));
}

bool intersects(in vec3 p){
    vec2 uv = p.xz + 0.5;
    // 确保 uv 在 [0, 1] 范围内
    uv = clamp(uv, 0.0, 1.0);
    return intersectsDam(uv);
}

vec4 Render(in vec3 ro, in vec3 rd) {
   vec3 n;
   vec3 rayDir = normalize(rd);
   vec2 ret = hitBox(ro, rayDir);
   if (ret.x > ret.y) discard;
   float alpha = 0.0;
   ret.x = max(ret.x, 0.0);
   vec3 p = ro + ret.x * rayDir;
   
   if(ret.x > 0.0) {
       vec3 pi = ro + rd * ret.x;
       vec3 tc;
       vec3 tn;
       float tt = ret.x;
       vec2 h = getHeight(pi);
       float spec;
       if(pi.y < h.x) {
           tn = getNormal(ro + rd * tt, 0);
           tc = vec3(0.8, 0.7, 0.6);  // 地形颜色
           alpha = 0.2;  // 地形透明度，可以根据需要调整
       }
       else {
           for (int i = 0; i < 180; i++) {
               vec3 p = ro + rd * tt;
               float h = p.y - getHeight(p).x;
               if (h < 0.0002 || tt > ret.y)
               break;
               tt += h * 0.4;
           }
           tn = getNormal(ro + rd * tt, 1);
           tc = shallow;  // 水的颜色
           alpha = 0.0;  // 初始时水是完全透明的
       }

       if(tt > ret.y) {
           tc = vec3(0, 0, 0.4);
           alpha = 0.0;
       }
       float wt = ret.x;
       h = getHeight(pi);
       vec3 waterNormal;
       if(pi.y < h.y) {
           waterNormal = n;
       }
       else {
           for (int i = 0; i < 180; i++) {
               vec3 p = ro + rd * wt;
               float h = p.y - getHeight(p).y;
               if (h < 0.0002 || wt > min(tt, ret.y))
               break;
               wt += h * 0.4;
           }
           waterNormal = getNormal(ro + rd * wt, 1);
       }
       if(wt < ret.y) {
           float dist = (min(tt, ret.y) - wt);
           vec3 p = ro + rd * wt;
           vec2 heights = getHeight(p);
           float waterDepth = heights.y - heights.x;
           if(waterDepth > 0.001) {  // 只在有水的地方渲染水
               vec3 lightDir = normalize(light - p);
               float spec = pow(max(0., dot(lightDir, reflect(rd, waterNormal))), 20.0);
               tc = mix(tc, deep, smoothstep(0.0, 0.05, waterDepth));
               alpha = mix(alpha, waterAlpha, smoothstep(0.0, 0.05, waterDepth));  // 水的透明度
               tc += 0.5 * spec * smoothstep(0.0, 0.1, dist);
               alpha = mix(alpha, 1.0, spec);  // 增加水面反光的不透明度
           }
       }
       return vec4(tc, alpha);
   }
   discard;
}

void main()
{
   vec3 rayDir = normalize(vd);
   vec4 col = Render(vo, rayDir);
   if(col.a < 0.01){
       discard;
   }
   gl_FragColor = col;
}
`;

/**
 * @description 自定义DC
 */
class CustomPrimitive {
  constructor(options) {
    this.commandType = options.commandType;

    this.geometry = options.geometry;
    this.attributeLocations = options.attributeLocations;
    this.primitiveType = options.primitiveType;

    this.uniformMap = options.uniformMap;

    this.vertexShaderSource = options.vertexShaderSource;
    this.fragmentShaderSource = options.fragmentShaderSource;

    this.rawRenderState = options.rawRenderState;
    this.framebuffer = options.framebuffer;

    this.outputTexture = options.outputTexture;

    this.autoClear = window.Cesium.defaultValue(options.autoClear, false);
    this.preExecute = options.preExecute;

    this.modelMatrix = window.Cesium.defaultValue(
      options.modelMatrix,
      window.Cesium.Matrix4.IDENTITY
    );
    this.show = true;
    this.commandToExecute = undefined;
    this.clearCommand = undefined;
    if (this.autoClear) {
      this.clearCommand = new window.Cesium.ClearCommand({
        color: new window.Cesium.Color(0.0, 0.0, 0.0, 0.0),
        depth: 1.0,
        framebuffer: this.framebuffer,
        pass: window.Cesium.Pass.OPAQUE,
      });
    }
  }

  createCommand(context) {
    context.depthTest = {
      enabled: true, // 开启碰撞检测
    };
    switch (this.commandType) {
      case "Draw": {
        let vertexArray = window.Cesium.VertexArray.fromGeometry({
          context: context,
          geometry: this.geometry,
          attributeLocations: this.attributeLocations,
          bufferUsage: window.Cesium.BufferUsage.STATIC_DRAW,
        });

        let shaderProgram = window.Cesium.ShaderProgram.fromCache({
          context: context,
          attributeLocations: this.attributeLocations,
          vertexShaderSource: this.vertexShaderSource,
          fragmentShaderSource: this.fragmentShaderSource,
        });

        // let renderState = window.Cesium.RenderState.fromCache(this.rawRenderState);
        let renderState = window.Cesium.RenderState.fromCache({
          cull: {
            enabled: true,
            face: window.Cesium.CullFace.BACK,
          },
          blending: {
            enabled: true,
            equationRgb: window.Cesium.BlendEquation.ADD,
            equationAlpha: window.Cesium.BlendEquation.ADD,
            functionSourceRgb: window.Cesium.BlendFunction.SOURCE_ALPHA,
            functionSourceAlpha: window.Cesium.BlendFunction.ONE,
            functionDestinationRgb:
              window.Cesium.BlendFunction.ONE_MINUS_SOURCE_ALPHA,
            functionDestinationAlpha:
              window.Cesium.BlendFunction.ONE_MINUS_SOURCE_ALPHA,
          },
          depthTest: {
            enabled: true,
          },
        });
        return new window.Cesium.DrawCommand({
          owner: this,
          vertexArray: vertexArray,
          primitiveType: this.primitiveType,
          uniformMap: this.uniformMap,
          modelMatrix: this.modelMatrix,
          shaderProgram: shaderProgram,
          framebuffer: this.framebuffer,
          renderState: renderState,
          pass: window.Cesium.Pass.OPAQUE,
        });
      }
      case "Compute": {
        return new window.Cesium.ComputeCommand({
          owner: this,
          fragmentShaderSource: this.fragmentShaderSource,
          uniformMap: this.uniformMap,
          outputTexture: this.outputTexture,
          persists: true,
        });
      }
    }
  }

  setGeometry(context, geometry) {
    this.geometry = geometry;
    let vertexArray = window.Cesium.VertexArray.fromGeometry({
      context: context,
      geometry: this.geometry,
      attributeLocations: this.attributeLocations,
      bufferUsage: window.Cesium.BufferUsage.STATIC_DRAW,
    });
    this.commandToExecute.vertexArray = vertexArray;
  }

  update(frameState) {
    if (!this.show) {
      return;
    }

    if (!window.Cesium.defined(this.commandToExecute)) {
      this.commandToExecute = this.createCommand(frameState.context);
    }

    if (window.Cesium.defined(this.preExecute)) {
      this.preExecute();
    }

    if (window.Cesium.defined(this.clearCommand)) {
      frameState.commandList.push(this.clearCommand);
    }
    frameState.commandList.push(this.commandToExecute);
  }

  isDestroyed() {
    return false;
  }

  destroy() {
    if (window.Cesium.defined(this.commandToExecute)) {
      this.commandToExecute.shaderProgram =
        this.commandToExecute.shaderProgram &&
        this.commandToExecute.shaderProgram.destroy();
    }
    return window.Cesium.destroyObject(this);
  }
}

/**
 * @description 渲染工具类
 */
class RenderUtil {
  constructor() {}

  static loadText(filePath) {
    let request = new XMLHttpRequest();
    request.open("GET", filePath, false);
    request.send();
    return request.responseText;
  }

  static getFullscreenQuad() {
    let fullscreenQuad = new window.Cesium.Geometry({
      attributes: new window.Cesium.GeometryAttributes({
        position: new window.Cesium.GeometryAttribute({
          componentDatatype: window.Cesium.ComponentDatatype.FLOAT,
          componentsPerAttribute: 3,
          //  v3----v2
          //  |     |
          //  |     |
          //  v0----v1
          values: new Float32Array([
            -1,
            -1,
            0, // v0
            1,
            -1,
            0, // v1
            1,
            1,
            0, // v2
            -1,
            1,
            0, // v3
          ]),
        }),
        st: new window.Cesium.GeometryAttribute({
          componentDatatype: window.Cesium.ComponentDatatype.FLOAT,
          componentsPerAttribute: 2,
          values: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
        }),
      }),
      indices: new Uint32Array([3, 2, 0, 0, 2, 1]),
    });
    return fullscreenQuad;
  }

  static createTexture(options) {
    if (window.Cesium.defined(options.arrayBufferView)) {
      // typed array needs to be passed as source option, this is required by window.Cesium.Texture
      let source = {};
      source.arrayBufferView = options.arrayBufferView;
      options.source = source;
    }

    let texture = new window.Cesium.Texture(options);
    return texture;
  }

  static createFramebuffer(context, colorTexture, depthTexture) {
    let framebuffer = new window.Cesium.Framebuffer({
      context: context,
      colorTextures: [colorTexture],
      depthTexture: depthTexture,
    });
    return framebuffer;
  }

  static createRawRenderState(options) {
    let translucent = true;
    let closed = false;
    let existing = {
      viewport: options.viewport,
      depthTest: options.depthTest,
      depthMask: options.depthMask,
      blending: options.blending,
    };

    let rawRenderState = window.Cesium.Appearance.getDefaultRenderState(
      translucent,
      closed,
      existing
    );
    return rawRenderState;
  }
}

class FluidDemo {
  constructor(viewer, options) {
    this._viewer = viewer;

    // 分辨率
    this._width = 1024;
    this._height = 1024;
    this._relativeToZ =
      (options.maxElevation - options.minElevation) / 2 + options.minElevation;
    this._thickness = options.maxElevation - options.minElevation;
    this._minElevation = options.minElevation;
    this._maxElevation = options.maxElevation;
    this._image = options.canvas;

    this._resolution = new window.Cesium.Cartesian2(this._width, this._height);
    this._waterPos = new window.Cesium.Cartesian2(0.62, 0.1);

    // buffer
    this.Buffer_A;
    this.Buffer_B;
    this.Buffer_C;
    this.Buffer_D;
    this.fluidCommand;

    // box
    this.outlineOnly;

    this.initShaderToy();
  }

  setWaterPos(pos) {
    this._waterPos = pos;
  }

  initShaderToy() {
    const texA = RenderUtil.createTexture({
      context: this._viewer.scene.context,
      width: this._width,
      height: this._height,
      pixelFormat: window.Cesium.PixelFormat.RGBA,
      pixelDatatype: window.Cesium.PixelDatatype.FLOAT,
      arrayBufferView: new Float32Array(this._width * this._height * 4),
    });
    const texB = RenderUtil.createTexture({
      context: this._viewer.scene.context,
      width: this._width,
      height: this._height,
      pixelFormat: window.Cesium.PixelFormat.RGBA,
      pixelDatatype: window.Cesium.PixelDatatype.FLOAT,
      arrayBufferView: new Float32Array(this._width * this._height * 4),
    });
    const texC = RenderUtil.createTexture({
      context: this._viewer.scene.context,
      width: this._width,
      height: this._height,
      pixelFormat: window.Cesium.PixelFormat.RGBA,
      pixelDatatype: window.Cesium.PixelDatatype.FLOAT,
      arrayBufferView: new Float32Array(this._width * this._height * 4),
    });
    const texD = RenderUtil.createTexture({
      context: this._viewer.scene.context,
      width: this._width,
      height: this._height,
      pixelFormat: window.Cesium.PixelFormat.RGBA,
      pixelDatatype: window.Cesium.PixelDatatype.FLOAT,
      arrayBufferView: new Float32Array(this._width * this._height * 4),
    });

    // Render Buffers
    const quadGeometry = RenderUtil.getFullscreenQuad();

    const heightMap = new window.Cesium.Texture({
      context: this._viewer.scene.context,
      width: 1024.0,
      height: 1024.0,
      pixelFormat: window.Cesium.PixelFormat.RGBA,
      pixelDatatype: window.Cesium.PixelDatatype.UNSIGNED_BYTE,
      flipY: false,
      // flipX: true,
      sampler: new window.Cesium.Sampler({
        minificationFilter: window.Cesium.TextureMinificationFilter.LINEAR,
        magnificationFilter: window.Cesium.TextureMagnificationFilter.LINEAR,
        wrapS: window.Cesium.TextureWrap.REPEAT,
        wrapT: window.Cesium.TextureWrap.REPEAT,
      }),
      source: this._image,
    });

    // BufferA
    this.Buffer_A = new CustomPrimitive({
      commandType: "Compute",
      uniformMap: {
        iTime: () => {
          return time;
        },
        iFrame: () => {
          return frame;
        },
        resolution: () => {
          return this._resolution;
        },
        iChannel0: () => {
          return texC;
        },
        iChannel1: () => {
          return texD;
        },
        heightMap: () => {
          return heightMap;
        },
        waterSource: () => {
          return this._waterPos;
        },
        waterAddRate: () => {
          return options.waterAddRate;
        },
        waterSourceRadius: () => {
          return options.waterSourceRadius;
        },
        initialWaterLevel: () => {
          return options.initialWaterLevel;
        },
        damStart: () => {
          return options.damStart;
        },
        damEnd: () => {
          return options.damEnd;
        },
        damHeight: () => {
          return options.damHeight;
        },
        evaporationRate: () => {
          return options.evaporationRate;
        },
      },
      fragmentShaderSource: new window.Cesium.ShaderSource({
        sources: [Command, BufferA],
      }),
      geometry: quadGeometry,
      outputTexture: texA,
      preExecute: () => {
        this.Buffer_A.commandToExecute.outputTexture = texA;
      },
    });

    // BufferB
    this.Buffer_B = new CustomPrimitive({
      commandType: "Compute",
      uniformMap: {
        iTime: () => {
          return time;
        },
        iFrame: () => {
          return frame;
        },
        resolution: () => {
          return this._resolution;
        },
        iChannel0: () => {
          return texA;
        },
        iChannel1: () => {
          return texD;
        },
        waterSource: () => {
          return this._waterPos;
        },
        waterSourceRadius: () => {
          return options.waterSourceRadius;
        },
        attenuation: () => {
          return options.attenuation;
        },
        strenght: () => {
          return options.strenght;
        },
        minTotalFlow: () => {
          return options.minTotalFlow;
        },
      },
      fragmentShaderSource: new window.Cesium.ShaderSource({
        sources: [Command, BufferB],
      }),
      geometry: quadGeometry,
      outputTexture: texB,
      preExecute: () => {
        this.Buffer_B.commandToExecute.outputTexture = texB;
      },
    });

    // BufferC
    this.Buffer_C = new CustomPrimitive({
      commandType: "Compute",
      uniformMap: {
        iTime: () => {
          return time;
        },
        iFrame: () => {
          return frame;
        },
        resolution: () => {
          return this._resolution;
        },
        iChannel0: () => {
          return texA;
        },
        iChannel1: () => {
          return texB;
        },
        waterSource: () => {
          return this._waterPos;
        },
        waterAddRate: () => {
          return options.waterAddRate;
        },
        waterSourceRadius: () => {
          return options.waterSourceRadius;
        },
        initialWaterLevel: () => {
          return options.initialWaterLevel;
        },
        evaporationRate: () => {
          return options.evaporationRate;
        },
      },
      fragmentShaderSource: new window.Cesium.ShaderSource({
        sources: [Command, BufferC],
      }),
      geometry: quadGeometry,
      outputTexture: texC,
      preExecute: () => {
        this.Buffer_C.commandToExecute.outputTexture = texC;
      },
    });

    // BufferD
    this.Buffer_D = new CustomPrimitive({
      commandType: "Compute",
      uniformMap: {
        iTime: () => {
          return time;
        },
        iFrame: () => {
          return frame;
        },
        resolution: () => {
          return this._resolution;
        },
        iChannel0: () => {
          return texC;
        },
        iChannel1: () => {
          return texB;
        },
        waterSource: () => {
          return this._waterPos;
        },
        waterSourceRadius: () => {
          return options.waterSourceRadius;
        },
        attenuation: () => {
          return options.attenuation;
        },
        strenght: () => {
          return options.strenght;
        },
        minTotalFlow: () => {
          return options.minTotalFlow;
        },
      },
      fragmentShaderSource: new window.Cesium.ShaderSource({
        sources: [Command, BufferD],
      }),
      geometry: quadGeometry,
      outputTexture: texD,
      preExecute: () => {
        this.Buffer_D.commandToExecute.outputTexture = texD;
      },
    });

    // Render Box
    let terrainMap = this._viewer.scene.frameState.context.defaultTexture;
    //../SampleData/models/CesiumAir/Cesium_Air.glb
    // Render Command
    const rectangle = window.Cesium.Rectangle.fromDegrees(...extent);
    // 获取矩形的西、南、东、北边界的经纬度
    const west = rectangle.west;
    const south = rectangle.south;
    const east = rectangle.east;
    const north = rectangle.north;

    // 计算南北方向的距离（高度）
    const verticalGeodesic = new window.Cesium.EllipsoidGeodesic(
      new window.Cesium.Cartographic((west + east) / 2, south),
      new window.Cesium.Cartographic((west + east) / 2, north)
    );
    const height = verticalGeodesic.surfaceDistance;

    // 计算东西方向的距离（宽度）
    const horizontalGeodesic = new window.Cesium.EllipsoidGeodesic(
      new window.Cesium.Cartographic(west, (south + north) / 2),
      new window.Cesium.Cartographic(east, (south + north) / 2)
    );
    const width = horizontalGeodesic.surfaceDistance;
    // 获取矩形的中心点
    const center = window.Cesium.Rectangle.center(rectangle);

    // 将中心点转换为经纬度
    const centerLongitude = window.Cesium.Math.toDegrees(center.longitude);
    const centerLatitude = window.Cesium.Math.toDegrees(center.latitude);
    const modelMatrix = generateModelMatrix(
      [centerLongitude, centerLatitude, this._relativeToZ], //this._relativeToZ
      [90, 0, 0],
      [width, this._thickness, height]
    );

    this.outlineOnly = this._viewer.entities.add({
      name: "Yellow box outline",
      position: window.Cesium.Cartesian3.fromDegrees(
        centerLongitude,
        centerLatitude,
        this._relativeToZ
      ),
      box: {
        dimensions: new window.Cesium.Cartesian3(
          width,
          height,
          this._thickness
        ),
        fill: false,
        outline: true,
        outlineColor: window.Cesium.Color.YELLOW,
      },
    });

    const boxGeometry = window.Cesium.BoxGeometry.fromDimensions({
      vertexFormat: window.Cesium.VertexFormat.POSITION_AND_ST,
      dimensions: new window.Cesium.Cartesian3(1, 1, 1),
    });
    const geometry = window.Cesium.BoxGeometry.createGeometry(boxGeometry);
    const attributelocations =
      window.Cesium.GeometryPipeline.createAttributeLocations(geometry);
    this.fluidCommand = new CustomPrimitive({
      commandType: "Draw",
      uniformMap: {
        iTime: () => {
          return time;
        },
        iFrame: () => {
          return frame;
        },
        iResolution: () => {
          return this._resolution;
        },
        iChannel0: () => {
          return texC;
        },
        iChannel1: () => {
          return terrainMap;
        },
        waterSource: () => {
          return this._waterPos;
        },
        depth: () => {
          return options.depth;
        },
        shallow: () => {
          return options.shallow;
        },
        deep: () => {
          return options.deep;
        },
        waterAlpha: () => {
          return options.waterAlpha;
        },
        damStart: () => {
          return options.damStart;
        },
        damEnd: () => {
          return options.damEnd;
        },
        damHeight: () => {
          return options.damHeight;
        },
      },
      geometry: geometry,
      modelMatrix: modelMatrix,
      attributeLocations: attributelocations,
      vertexShaderSource: new window.Cesium.ShaderSource({
        sources: [
          `
                   attribute vec3 position;
                   attribute vec2 st;
                 
                   varying vec3 vo;
                   varying vec3 vd;
                   varying vec2 v_st;
                   void main()
                   {    
                       vo = czm_encodedCameraPositionMCHigh + czm_encodedCameraPositionMCLow;
                       vd = position - vo;
                       v_st = st;
                       gl_Position = czm_modelViewProjection * vec4(position,1.0);
                   }
                   `,
        ],
      }),
      fragmentShaderSource: new window.Cesium.ShaderSource({
        sources: [Command + renderShaderSource],
      }),
    });

    // Render Event
    let time = 1.0;
    let frame = 0;
    this._viewer.scene.postRender.addEventListener(() => {
      const now = performance.now();
      time = now / 1000;
      frame += 0.02;
    });
    this._viewer.scene.primitives.add(this.Buffer_A);
    this._viewer.scene.primitives.add(this.Buffer_B);
    this._viewer.scene.primitives.add(this.Buffer_C);
    this._viewer.scene.primitives.add(this.Buffer_D);
    this._viewer.scene.primitives.add(this.fluidCommand);
  }

  destroyShaderToy() {
    // 销毁buffer
    this._viewer.scene.primitives.remove(this.fluidCommand);
    this._viewer.scene.primitives.remove(this.Buffer_D);
    this._viewer.scene.primitives.remove(this.Buffer_C);
    this._viewer.scene.primitives.remove(this.Buffer_B);
    this._viewer.scene.primitives.remove(this.Buffer_A);

    // 销毁线框
    this._viewer.entities.remove(this.outlineOnly);

    // 销毁闸门
    this._viewer.entities.remove(blueWall);
    blueWall = null;

    // 隐藏界面
    // changeGuiShow(false);
  }
}

/**
 * 生成矩阵
 * @param {*} position
 * @param {*} rotation
 * @param {*} scale
 * @returns
 */
const generateModelMatrix = (
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1]
) => {
  const rotationX = window.Cesium.Matrix4.fromRotationTranslation(
    window.Cesium.Matrix3.fromRotationX(
      window.Cesium.Math.toRadians(rotation[0])
    )
  );

  const rotationY = window.Cesium.Matrix4.fromRotationTranslation(
    window.Cesium.Matrix3.fromRotationY(
      window.Cesium.Math.toRadians(rotation[1])
    )
  );

  const rotationZ = window.Cesium.Matrix4.fromRotationTranslation(
    window.Cesium.Matrix3.fromRotationZ(
      window.Cesium.Math.toRadians(rotation[2])
    )
  );
  if (!(position instanceof window.Cesium.Cartesian3)) {
    position = window.Cesium.Cartesian3.fromDegrees(...position);
  }
  const enuMatrix = window.Cesium.Transforms.eastNorthUpToFixedFrame(position);
  window.Cesium.Matrix4.multiply(enuMatrix, rotationX, enuMatrix);
  window.Cesium.Matrix4.multiply(enuMatrix, rotationY, enuMatrix);
  window.Cesium.Matrix4.multiply(enuMatrix, rotationZ, enuMatrix);
  const scaleMatrix = window.Cesium.Matrix4.fromScale(
    new window.Cesium.Cartesian3(...scale)
  );
  const modelMatrix = window.Cesium.Matrix4.multiply(
    enuMatrix,
    scaleMatrix,
    new window.Cesium.Matrix4()
  );

  return modelMatrix;
};

// const main = async () => {
//   await initViewer();
// };

// window.onload = main;

async function getImageSource() {
  const image = await window.Cesium.Resource.fetchImage({
    url: config.url,
  });
  return {
    minElevation: config.minElevation,
    maxElevation: config.maxElevation,
    canvas: image,
  };
}

async function getImage(viewer) {
  const rectangle = window.Cesium.Rectangle.fromDegrees(...extent);
  const width = 1024;
  const height = 1024;

  // 创建Canvas
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  const positions = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const longitude = window.Cesium.Math.toDegrees(
        window.Cesium.Math.lerp(rectangle.west, rectangle.east, x / (width - 1))
      );
      const latitude = window.Cesium.Math.toDegrees(
        window.Cesium.Math.lerp(
          rectangle.north,
          rectangle.south,
          y / (height - 1)
        )
      );
      positions.push(
        window.Cesium.Cartographic.fromDegrees(longitude, latitude)
      );
    }
  }

  const samples = await window.Cesium.sampleTerrainMostDetailed(
    viewer.terrainProvider,
    positions
  );

  // 获取最大和最小高程值
  let minElevation = Infinity;
  let maxElevation = -Infinity;
  for (const sample of samples) {
    if (sample.height < minElevation) {
      minElevation = sample.height;
    }
    if (sample.height > maxElevation) {
      maxElevation = sample.height;
    }
  }

  // 将高程值绘制到Canvas上
  const imageData = context.createImageData(width, height);
  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i];
    const elevation = sample.height;
    const normalized =
      (elevation - minElevation) / (maxElevation - minElevation);
    const grayscale = Math.floor(normalized * 255);

    const x = i % width;
    const y = Math.floor(i / width);

    const index = (y * width + x) * 4;
    imageData.data[index] = grayscale;
    imageData.data[index + 1] = grayscale;
    imageData.data[index + 2] = grayscale;
    imageData.data[index + 3] = 255;
  }
  context.putImageData(imageData, 0, 0);
  // 地形调试;
  canvas.toBlob((blob) => {
    const timestamp = Date.now().toString();
    const a = document.createElement("a");
    document.body.append(a);
    a.download = `${timestamp}.png`;
    a.href = URL.createObjectURL(blob);
    a.click();
    a.remove();
  });
  console.log(minElevation, maxElevation);
  return {
    minElevation,
    maxElevation,
    canvas,
  };
}

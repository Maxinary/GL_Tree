class Drawable{//would work well as a factory
  constructor(shaderAttributes, drawMod, abscoords){//for now: shape coord, tex coord, indexies
    this.shadeAttribs = shaderAttributes;
    //console.log(this.shadeAttribs);
    this.shadeObjs = {};
    for(var key in shaderAttributes){
      this.shadeObjs[key] = gl.createBuffer();
    }
    this.drawMod = drawMod;
    this.coords = abscoords;
    this.rotation = [0,0,0];
  }
  
  copy(){
    return new Drawable(JSON.parse(JSON.stringify(this.shadeAttribs)), this.drawMod, this.coords);
  }
  
  stretch(arr3){
    var o = this.copy().shadeAttribs;
    for(var i=0;i<o.vertexPositionBuffer.length;i+=3){
      for(var j=0;j<3;j++){
        o.vertexPositionBuffer[i+j] = o.vertexPositionBuffer[i+j]*arr3[j];
      }
    }
    return o;
  }
}

class Tree{//Oshitwaddup it's a tree datatype too, who would have guessed
  constructor(angle, heightPercent, initialHeight, initialAge, branches){
    this.angle = angle;
    this.heightPercent = heightPercent;
    this.initialHeight = initialHeight;
    
    this.children = [];
    if(initialAge>0){
      for(var i=0;i<branches;i++){
        this.children.push(new Tree(angle, heightPercent, initialHeight*heightPercent, initialAge-1, branches)); //new set of branches which are smaller than the last
      }
    }
  }
  
  draw(rotationStack, currentPos){//render the whole thing
    if(rotationStack === undefined){
      rotationStack = [[0, 1, 0]];
      currentPos = [0,0,0];
    }
    var out = new Drawable({
      "vertexPositionBuffer":[],
      "vertexColorBuffer":[],
      "vertexIndexBuffer":[]
    }, gl.TRIANGLES, [0.0, 0.0, 0.0]);

    //this 1
    var stretched = cyllinder.stretch([1, this.heightPercent*this.initialHeight, 1]);
    var kbuf = stretched.vertexPositionBuffer;
    //update positioning
    var rotatePositions = [0, this.initialHeight*this.heightPercent, 0];
    for(var h=0; h<rotationStack.length; h++){
      for(var i=0;i<kbuf.length;i+=3){//iterate and rotate
        var temp = rotate(kbuf[i], kbuf[i+1], kbuf[i+2], rotationStack[h][0], rotationStack[h][1], rotationStack[h][2], this.angle);

        for(var j=0; j<3; j++){
          kbuf[i+j] = temp[j];
        }
      }
      rotatePositions = rotate(rotatePositions[0], rotatePositions[1], rotatePositions[2], rotationStack[h][0], rotationStack[h][1], rotationStack[h][2], this.angle);
    }

    for(var i=0;i<3;i++){
      rotatePositions[i] += currentPos[i];
    }
//    rotatePositions[1]-=5
//    console.log();
    for(var i=0; i<kbuf.length; i+=3){//iterate and rotate
      for(var j=0;j<3;j++){
        kbuf[i+j] += currentPos[j];
      }
    }
    
//    currentPos[0]+=2.5;

    console.log(currentPos);
    
    out.shadeAttribs.vertexPositionBuffer = out.shadeAttribs.vertexPositionBuffer.concat(kbuf);
      
    out.shadeAttribs.vertexColorBuffer = out.shadeAttribs.vertexColorBuffer.concat(cyllinder.shadeAttribs.vertexColorBuffer);
    
    out.shadeAttribs.vertexIndexBuffer = out.shadeAttribs.vertexIndexBuffer.concat(cyllinder.shadeAttribs.vertexIndexBuffer);
    
//    rotationStack.push([Math.PI*Math.random()-Math.PI/4, Math.PI/2*Math.random()-Math.PI/4, Math.PI/2*Math.random()-Math.PI/4]);
    var numberOfIndecies = kbuf.length/3;
    for(var i=0;i<this.children.length;i++){
      var childs = this.children[i].draw(JSON.parse(JSON.stringify(rotationStack.concat([[Math.random()-0.5, Math.random()-0.5, Math.random()-0.5]]))), JSON.parse(JSON.stringify(rotatePositions)));

      //recursion, man
      out.shadeAttribs.vertexPositionBuffer = out.shadeAttribs.vertexPositionBuffer.concat(JSON.parse(JSON.stringify(childs.shadeAttribs.vertexPositionBuffer)));

      out.shadeAttribs.vertexColorBuffer = out.shadeAttribs.vertexColorBuffer.concat(JSON.parse(JSON.stringify(childs.shadeAttribs.vertexColorBuffer)));

      var k = JSON.parse(JSON.stringify(childs.shadeAttribs.vertexIndexBuffer));

      for(var j=0;j<k.length;j++){
        k[j] += numberOfIndecies;        
      }

      numberOfIndecies = numberOfIndecies + childs.shadeAttribs.vertexPositionBuffer.length/3;

      out.shadeAttribs.vertexIndexBuffer = out.shadeAttribs.vertexIndexBuffer.concat(k);
    }
    return out;
  }
}

//from http://inside.mines.edu/fs_home/gmurray/ArbitraryAxisRotation/
function rotate(x, y, z, u, v, w, theta){
  var squareSum = Math.pow(u, 2.0)+Math.pow(v, 2.0)+Math.pow(w, 2.0);
  var cos = Math.cos(theta);
  var sin = Math.sin(theta);
  var multiplied = u*x+v*y+w*z;
  var sqrSquareSum = Math.sqrt(squareSum);

  return [
    (u*multiplied*(1-cos)+squareSum*x*cos+sqrSquareSum*(-w*y+v*z)*sin)/(squareSum),
    (v*multiplied*(1-cos)+squareSum*y*cos+sqrSquareSum*(w*x-u*z)*sin)/(squareSum),
    (w*multiplied*(1-cos)+squareSum*z*cos+sqrSquareSum*(-v*x+u*y)*sin)/(squareSum)
    ];
}

var gl;//the canvas context
var drawings = [];//the list of things being drawn
var shaderProgram;

//matrices
var mvMatrix = mat4.create();
var mvMatrixStack = [];
var pMatrix = mat4.create();

//personal movement
var thetaX = 0;
var thetaY = 0;
var thetaZ = 0;
var move = [1,0];
worldShift = [0,0,0];

function initGL(canvas) {
  try {
    canvas.width=document.body.clientWidth;
    canvas.height=document.body.clientHeight;
    gl = canvas.getContext("experimental-webgl");
    gl.viewportWidth = canvas.width;
    gl.viewportHeight = canvas.height;
  } catch (e) {}
  if (!gl) {
    alert("Could not initialise WebGL, sorry :-(");
  }
}

function getShader(gl, id) {
  var shaderScript = document.getElementById(id);
  if (!shaderScript) {
    return null;
  }

  var str = "";
  var k = shaderScript.firstChild;
  while (k) {
    if (k.nodeType == 3) {
      str += k.textContent;
    }
    k = k.nextSibling;
  }

  var shader;
  if (shaderScript.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type == "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    return null;
  }

  gl.shaderSource(shader, str);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  }

  return shader;
}

function initShaders() {
  var fragmentShader = getShader(gl, "shader-fs");
  var vertexShader = getShader(gl, "shader-vs");

  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
      alert("Could not initialise shaders");
  }

  gl.useProgram(shaderProgram);

  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

  shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aColor");
  gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);

  shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
  shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
  shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, "uSampler");
}

function setMatrixUniforms() {
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
  var normalMatrix = mat3.create();
  mat4.toInverseMat3(mvMatrix, normalMatrix);
  mat3.transpose(normalMatrix);
  gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, normalMatrix);
}

function mvPushMatrix() {
  var copy = mat4.create();
  mat4.set(mvMatrix, copy);
  mvMatrixStack.push(copy);
}

function mvPopMatrix() {
  if (mvMatrixStack.length === 0) {
    throw "Invalid popMatrix!";
  }
  mvMatrix = mvMatrixStack.pop();
}

var cyllinder;

function initBuffers() {
  cyllinder = new Drawable({
    "vertexPositionBuffer":[],
    "vertexColorBuffer":[],
    "vertexIndexBuffer":[]
  }, gl.TRIANGLES, [0.0, 0.0, 0.0]);
  
  for(var i=0;i<60;i++){
    cyllinder.shadeAttribs.vertexPositionBuffer = cyllinder.shadeAttribs.vertexPositionBuffer.concat([//first rectangle
      Math.cos(Math.PI*2*(i/60)), 0.0, Math.sin(Math.PI*2*(i/60)),
      Math.cos(Math.PI*2*(i/60)), 1.0, Math.sin(Math.PI*2*(i/60))
    ]);
    
    cyllinder.shadeAttribs.vertexColorBuffer = cyllinder.shadeAttribs.vertexColorBuffer.concat([
      255.0/255.0, 0.0/255.0, 0.0/255.0, 1.0,
      255.0/255.0, 0.0/255.0, 0.0/255.0, 1.0,
      255.0/255.0, 0.0/255.0, 0.0/255.0, 1.0,
      255.0/255.0, 0.0/255.0, 0.0/255.0, 1.0
    ]);

    cyllinder.shadeAttribs.vertexIndexBuffer = cyllinder.shadeAttribs.vertexIndexBuffer.concat([
      (2*i)%120, (2*i+1)%120, (2*i+2)%120,
      (2*i+3)%120, (2*i+2)%120, (2*i+1)%120,
      0, (2*i)%120, (2*i+2)%120,
      1, (2*i+3)%120, (2*i+1)%120
    ]);
  }

//  drawings.push(cyllinder.copy());
//  drawings.push(new Drawable(cyllinder.stretch([1,20,1]), gl.TRIANGLES, [0,0,0]));
  var meme = cyllinder.copy();
  for(var i=0;i<meme.shadeAttribs.vertexPositionBuffer.length;i+=3){
    var temp = rotate(meme.shadeAttribs.vertexPositionBuffer[i], meme.shadeAttribs.vertexPositionBuffer[i+1], meme.shadeAttribs.vertexPositionBuffer[i+2], 1, 1, 1, Math.PI/2);
    for(var j=0;j<3;j++){
      meme.shadeAttribs.vertexPositionBuffer[i+j] = temp[j];
    }
    meme.shadeAttribs.vertexPositionBuffer[i+1] += 5;
  }
//  drawings.push(meme);
//  drawings.push(cyllinder);
  drawings.push((new Tree(1, 0.7, 20, 4, 3)).draw());

  for(var ii=0; ii<drawings.length; ii++){
    gl.bindBuffer(gl.ARRAY_BUFFER, drawings[ii].shadeObjs.vertexPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(drawings[ii].shadeAttribs.vertexPositionBuffer), gl.STATIC_DRAW);
    drawings[ii].shadeObjs.vertexPositionBuffer.itemSize = 3;
    drawings[ii].shadeObjs.vertexPositionBuffer.numItems = drawings[ii].shadeAttribs.vertexPositionBuffer.length/3;
    
    gl.bindBuffer(gl.ARRAY_BUFFER, drawings[ii].shadeObjs.vertexColorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(drawings[ii].shadeAttribs.vertexColorBuffer), gl.STATIC_DRAW);
    drawings[ii].shadeObjs.vertexColorBuffer.itemSize = 4;
    drawings[ii].shadeObjs.vertexColorBuffer.numItems = drawings[ii].shadeAttribs.vertexColorBuffer.length/4;

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, drawings[ii].shadeObjs.vertexIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(drawings[ii].shadeAttribs.vertexIndexBuffer), gl.STATIC_DRAW);
    drawings[ii].shadeObjs.vertexIndexBuffer.itemSize = 1;
    drawings[ii].shadeObjs.vertexIndexBuffer.numItems = drawings[ii].shadeAttribs.vertexIndexBuffer.length;
  }
  console.log(drawings);
}

function drawScene() {
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.clearColor(0, 0, 0, 0.3);

  mat4.perspective(45.0, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix);

  mat4.identity(mvMatrix);

  mat4.rotate(mvMatrix, thetaX, [1, 0, 0]);
  mat4.rotate(mvMatrix, thetaY, [0, 1, 0]);
  mat4.rotate(mvMatrix, thetaZ, [0, 0, 1]);

  mat4.translate(mvMatrix,  worldShift);

  for(var ii=0;ii<drawings.length;ii++){
    mvPushMatrix();

    mat4.rotate(mvMatrix, drawings[ii].rotation[0], [1, 0, 0]);
    mat4.rotate(mvMatrix, drawings[ii].rotation[1], [0, 1, 0]);
    mat4.rotate(mvMatrix, drawings[ii].rotation[2], [0, 0, 1]);

    mat4.translate(mvMatrix,  drawings[ii].coords);

    //vertices
    gl.bindBuffer(gl.ARRAY_BUFFER, drawings[ii].shadeObjs.vertexPositionBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, drawings[ii].shadeObjs.vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0); 

    //coloring
    gl.bindBuffer(gl.ARRAY_BUFFER, drawings[ii].shadeObjs.vertexColorBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, drawings[ii].shadeObjs.vertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0);

    //vertex index buffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, drawings[ii].shadeObjs.vertexIndexBuffer);

    setMatrixUniforms();
    gl.drawElements(drawings[ii].drawMod, drawings[ii].shadeObjs.vertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);

    mvPopMatrix();
  }
}

function tick(){
  requestAnimFrame(tick);
  move = [Math.sin(thetaY)/5, Math.cos(thetaY)/5];
  keyTick();
  drawScene();
}

function webGLStart() {
  var canvas = document.getElementById("lesson01-canvas");
  initGL(canvas);
  initShaders();
  initBuffers();

  registerKeyPress(buttonMove.hold, 38, function(){thetaX-=0.02;});
  registerKeyPress(buttonMove.hold, 40, function(){thetaX+=0.02;});
  registerKeyPress(buttonMove.hold, 37, function(){thetaY-=0.02;});
  registerKeyPress(buttonMove.hold, 39, function(){thetaY+=0.02;});

  registerKeyPress(buttonMove.hold, 83, function(){worldShift[0]+=move[0];worldShift[2]-=move[1];});
  registerKeyPress(buttonMove.hold, 87, function(){worldShift[0]-=move[0];worldShift[2]+=move[1];});
  registerKeyPress(buttonMove.hold, 65, function(){worldShift[0]+=move[1];worldShift[2]+=move[0];});
  registerKeyPress(buttonMove.hold, 68, function(){worldShift[0]-=move[1];worldShift[2]-=move[0];});
  registerKeyPress(buttonMove.hold, 16, function(){worldShift[1]+=1/5;});//down
  registerKeyPress(buttonMove.hold, 32, function(){worldShift[1]-=1/5;});//up

  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);

  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);

  tick();
}
// Constants
// incremental adjustment of the camera's orientation
const deltaYaw = 1;
// the center position of each cube in the world coordinates
const centerArray = [vec3(-3, 0, 0), vec3(3, 0, 0)];
// rotation axes of the cubes
const rotationAxisArray = [[0, 1, 0], [1, 0, 0]];
// rotation rates of the cubes
const speedArray = [10, 5];
const rotationTextureSpeed = 15;

// global variables
// array of cubes
var cubeBuffer = [];
// camera
var camera = new Camera();
// projection
var projection = new Projection();
// variables for animation
var cube_rotate = false;
var texture_rotate = false;
var texture_scroll = false;

// calculate a matrix for perspective projection
function perspective(near, far, top, bottom, left, right) {
    var v00 = 2 * near / (right - left);
    var v02 = (right + left) / (right - left);
    var v11 = 2 * near / (top - bottom);
    var v12 = (top + bottom) / (top - bottom);
    var v22 = -(far + near) / (far - near);
    var v23 = -2 * far * near / (far - near);

    var result = mat4();
    result[0][0] = v00;
    result[0][2] = v02;
    result[1][1] = v11;
    result[1][2] = v12;
    result[2][2] = v22;
    result[2][3] = v23;
    result[3][2] = -1;
    result[3][3] = 0;

    return result;
}

// Cube objects
function Cube() {
    // array of vertices in the object coordinates 
    this.vertexArray = [vec4(-1, -1, -1, 1),
                        vec4(-1, 1, -1, 1),
                        vec4(1, -1, -1, 1),
                        vec4(1, 1, -1, 1),
                        vec4(1, 1, 1, 1),
                        vec4(-1, 1, -1, 1),
                        vec4(-1, 1, 1, 1),
                        vec4(-1, -1, -1, 1),
                        vec4(-1, -1, 1, 1),
                        vec4(1, -1, -1, 1),
                        vec4(1, -1, 1, 1),
                        vec4(1, 1, 1, 1),
                        vec4(-1, -1, 1, 1),
                        vec4(-1, 1, 1, 1)];

    this.textureCoord;
    this.textureImage;
    this.wrapMode;
    this.filterMode;
    this.MipMap = false;
    // the center of the cube
    this.center = vec4();
    // transformation for texture
    this.textureTransform = mat3();
    // transformation for the cube               
    this.transformation = mat4();

    // Methods
    this.init = function (center, imageID, wrap, filter, textureCoord, MipMap) {
        this.translation(center[0], center[1], center[2]);
        this.center = center;

        // load the image as the texture
        this.textureImage = document.getElementById(imageID);
        this.wrapMode = wrap;
        this.filterMode = filter;
        this.textureCoord = textureCoord;
        this.MipMap = MipMap;
    }
    // calculate the transformation matrix from the translate operation
    this.translation = function (x, y, z) {
        this.transformation = mult(translate(x, y, z), this.transformation);
    }
    // calculate the transformation matrix from the rotate operation
    this.rotation = function (theta, axis) {
        this.transformation = mult(rotate(theta, axis), this.transformation);
    }
    // calculate the transformation matrix from the scale operation
    this.scale = function (x, y, z) {
        this.transformation = mult(scale(x, y, z), this.transformation);
    }
    this.textureTranslation = function (x, y) {
        var delta = mat3(vec3(1, 0, x), vec3(0, 1, y), vec3(0, 0, 1));
        this.textureTransform = mult(delta, this.textureTransform);
    }
    this.textureRotation = function (theta, center) {
        //console.log(this.textureTransform);
        var c = Math.cos(radians(theta));
        var s = Math.sin(radians(theta));
        var delta = mat3(vec3(c, -s, 0), vec3(s, c, 0), vec3(0, 0, 1));
        this.textureTranslation(-center[0], -center[1]);
        //this.textureTranslation(-3, -0);
        this.textureTransform = mult(delta, this.textureTransform);
        //console.log(this.textureTransform);
        this.textureTranslation(center[0], center[1]);
    }

    this.bind = function (gl) {
        // get the pipeline
        var program = gl.getParameter(gl.CURRENT_PROGRAM);

        var modelViewMatrix = mult(camera.worldToEye(), this.transformation);
        var modelLoc = gl.getUniformLocation(program, "u_modelViewMatrix");
        gl.uniformMatrix4fv(modelLoc, false, new Float32Array(flatten(modelViewMatrix)));

        var texMatrixLoc = gl.getUniformLocation(program, "u_textureTransform");
        gl.uniformMatrix3fv(texMatrixLoc, false, new Float32Array(flatten(this.textureTransform)));

        // bind vertex position
        var positionLoc = gl.getAttribLocation(program, "a_position");
        var positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(this.vertexArray), gl.STATIC_DRAW);

        gl.enableVertexAttribArray(positionLoc);
        gl.vertexAttribPointer(positionLoc, 4, gl.FLOAT, false, 0, 0);

        var texCordLoc = gl.getAttribLocation(program, "a_textureCoord");
        var texCordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, texCordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(this.textureCoord), gl.STATIC_DRAW);

        gl.enableVertexAttribArray(texCordLoc);
        gl.vertexAttribPointer(texCordLoc, 3, gl.FLOAT, false, 0, 0);

        // configure the texture
        var texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, this.textureImage);
        if (this.MipMap) gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, this.filterMode[0]);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, this.filterMode[1]);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, this.wrapMode[0]);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, this.wrapMode[1]);
        gl.uniform1i(gl.getUniformLocation(program, "u_texture"), 0);
    };
    this.draw = function (gl) {
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.vertexArray.length);
    };
    // rotate the cube around its center
    this.animation = function (rate, vec) {
        this.translation(-this.center[0], -this.center[1], -this.center[2]);
        this.rotation(rate, vec);
        this.translation(this.center[0], this.center[1], this.center[2]);
    };

}

function Camera() {
    // Properties
    this.initial = vec3(0, 0, 0);    // inital position
    this.position = vec3(0, 0, 0);   // current position
    this.orientation = 0;            // current orientation: x-theta, y-theta, z-theta
    this.transformation = mat4();
    // Methods
    this.init = function (x, y, z, theta) {
        this.initial = vec3(x, y, z);
        this.position = vec3(x, y, z);
        this.orientation = theta;
        this.transformation = translate(-x, -y, -z);
    }
    this.worldToEye = function () {
        return this.transformation;
    }
    // navigate the camera
    this.up = function () {
        this.transformation = mult(translate(0, -0.1, 0), this.transformation);
        this.position = add(this.position, vec3(0, 0.1, 0));
    }
    this.down = function () {
        this.transformation = mult(translate(0, 0.1, 0), this.transformation);
        this.position = add(this.position, vec3(0, -0.1, 0));
    }
    this.forward = function () {
        var direction = vec3(Math.sin(radians(this.orientation)), 0, Math.cos(radians(this.orientation)));
        direction = scale(0.1, direction);
        this.transformation = mult(translate(direction[0], direction[1], direction[2]), this.transformation);
        this.position = add(this.position, negate(direction));
    }
    this.backward = function () {
        var direction = vec3(Math.sin(radians(this.orientation)), 0, Math.cos(radians(this.orientation)));
        direction = scale(-0.1, direction);
        this.transformation = mult(translate(direction[0], direction[1], direction[2]), this.transformation);
        this.position = add(this.position, negate(direction));
    }
    this.left = function () {
        var direction = vec3(Math.sin(radians(this.orientation)), 0, Math.cos(radians(this.orientation)));
        var up = vec3(0, 1, 0);
        // use cross product to calculate the perpendicular vector of the plane consisting of the orientation of camera and y-axis
        direction = cross(direction, up);
        direction = normalize(direction, false);
        direction = scale(-0.1, direction);
        this.transformation = mult(translate(direction[0], direction[1], direction[2]), this.transformation);
        this.position = add(this.position, negate(direction));
    }
    this.right = function () {
        var direction = vec3(Math.sin(radians(this.orientation)), 0, Math.cos(radians(this.orientation)));
        var up = vec3(0, 1, 0);
        direction = cross(direction, up);
        direction = normalize(direction, false);
        direction = scale(0.1, direction);
        this.transformation = mult(translate(direction[0], direction[1], direction[2]), this.transformation);
        this.position = add(this.position, negate(direction));
    }
    this.lYaw = function () {
        // translate the camera back to the origin then rotate it
        this.transformation = mult(rotate(-deltaYaw, [0, 1, 0]), this.transformation);
        this.orientation += deltaYaw;
    }
    this.rYaw = function () {
        this.transformation = mult(rotate(deltaYaw, [0, 1, 0]), this.transformation);
        this.orientation += -deltaYaw;
    }
}

function Projection() {
    // the parameters of view box
    this.near = -1;
    this.far = 1;
    this.top = 1;
    this.bottom = -1;
    this.left = -1;
    this.right = 1;
    this.type = "orthographic";
    this.init = function (near, far, top, bottom, left, right, type) {
        this.near = near;
        this.far = far;
        this.top = top;
        this.bottom = bottom;
        this.left = left;
        this.right = right;
        this.type = "perspective";
    }
    this.bind = function (gl) {
        var program = gl.getParameter(gl.CURRENT_PROGRAM);

        // calculate the projection matrix with the parameters of view box
        var projection = mat4();
        if (this.type == "perspective") {
            projection = perspective(this.near, this.far, this.top, this.bottom, this.left, this.right);
        }
        else if (this.type == "orthographic") {
            projection = ortho(this.left, this.right, this.bottom, this.top, this.near, this.far);
        }

        var projLoc = gl.getUniformLocation(program, "u_projectionMatrix");
        gl.uniformMatrix4fv(projLoc, false, new Float32Array(flatten(projection)));
    }
}

function init() {
    var canvas = document.getElementById("glcanvas");
    var gl = initWebGL(canvas);

    if (gl) {
        // setup the render pipeline consisting of programmable shaders
        var vertexShader = getShader(gl, "vertex-shader");
        var fragmentShader = getShader(gl, "fragment-shader");

        if (!vertexShader || !fragmentShader) {
            return;
        }

        var renderPipeline = getProgram(gl, [vertexShader, fragmentShader]);

        if (!renderPipeline) {
            return;
        }

        gl.useProgram(renderPipeline);

        // initial position of the camera
        camera.init(0, 0, 5, 0);

        // calculate perspective projection
        projection.init(3, 15, 4, -4, -4, 4, "perspective");
        projection.bind(gl);

        var sourceArray = ["texture1", "texture2"];
        // arrays for configuration of the texture, the first element is for the cube from step #3, the second element is for the cube from step #4
        var wrapArray = [vec2(gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE), vec2(gl.CLAMP_TO_EDGE, gl.REPEAT)];
        var fliterArray = [vec2(gl.NEAREST, gl.NEAREST), vec2(gl.LINEAR_MIPMAP_LINEAR, gl.LINEAR)];
        var MipmapArray = [false, true];
        // texture coordinates
        var textureCoordArray = [[vec3(1, 0, 1),
                              vec3(1, 1, 1),
                              vec3(0, 0, 1),
                              vec3(0, 1, 1),
                              vec3(1, 1, 1),
                              vec3(0, 0, 1),
                              vec3(1, 0, 1),
                              vec3(0, 1, 1),
                              vec3(1, 1, 1),
                              vec3(0, 0, 1),
                              vec3(1, 0, 1),
                              vec3(1, 1, 1),
                              vec3(0, 0, 1),
                              vec3(0, 1, 1)],
                             [vec3(0.75, 0.25, 1),
                              vec3(0.75, 0.75, 1),
                              vec3(0.25, 0.25, 1),
                              vec3(0.25, 0.75, 1),
                              vec3(0.75, 0.75, 1),
                              vec3(0.25, 0.25, 1),
                              vec3(0.75, 0.25, 1),
                              vec3(0.25, 0.75, 1),
                              vec3(0.75, 0.75, 1),
                              vec3(0.25, 0.25, 1),
                              vec3(0.75, 0.25, 1),
                              vec3(0.75, 0.75, 1),
                              vec3(0.25, 0.25, 1),
                              vec3(0.25, 0.75, 1)]];

        // place the objects in the scene coordinates
        for (var i = 0; i < centerArray.length; i++) {
            // instance cube
            cubeBuffer.push(new Cube());
            // transform it to the position in the scene coordinates
            cubeBuffer[i].init(centerArray[i], sourceArray[i], wrapArray[i], fliterArray[i], textureCoordArray[i], MipmapArray[i]);
        }

        gl.enable(gl.DEPTH_TEST);
        gl.clearDepth(1.0, 1.0, 1.0, 1.0);
        gl.clearColor(1.0, 1.0, 1.0, 1.0);
        render();
    }
}

function initWebGL(canvas) {
    var gl = null;

    // assign the canvas with the context of WebGL and check whether the browser supports it
    try {
        gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    }
    catch (e) { }

    if (!gl) {
        alert("Unable to initialize WebGL. Your browser may not support it.");
        gl = null;
    }
    return gl;
}

function getShader(gl, id) {
    // find the root of the source code of shader
    var shaderScript = document.getElementById(id);

    if (!shaderScript) {
        console.log("Unable to find shader.");
        return null;
    }

    // get the GLSL source code of shader
    var Source = "";
    currentChild = shaderScript.firstChild;
    while (currentChild) {
        if (currentChild.nodeType == currentChild.TEXT_NODE) {
            Source += currentChild.textContent;
        }
        currentChild = currentChild.nextSibling;
    }

    // create a shader 
    var Shader;
    if (shaderScript.type == "x-shader/x-vertex") {
        Shader = gl.createShader(gl.VERTEX_SHADER);
    }
    else if (shaderScript.type == "x-shader/x-fragment") {
        Shader = gl.createShader(gl.FRAGMENT_SHADER);
    }
    else {
        console.log("Incorrect type of shader.");
        return null;
    }

    // compile the source code of shader and check whether the compilation succeeds
    gl.shaderSource(Shader, Source);
    gl.compileShader(Shader);

    if (!gl.getShaderParameter(Shader, gl.COMPILE_STATUS)) {
        console.log("Shader comile error: " + gl.getShaderInfoLog(Shader));
        return null;
    }

    return Shader;
}

function getProgram(gl, arrayShader) {
    var Program = gl.createProgram();

    // attach each shader in the array of shaders to the program
    for (var i = 0; i < arrayShader.length; i++) {
        gl.attachShader(Program, arrayShader[i]);
    }

    gl.linkProgram(Program);

    if (!gl.getProgramParameter(Program, gl.LINK_STATUS)) {
        console.log("Program link error: " + gl.getProgramInfoLog(Program));
        return null;
    }

    return Program;
}

// Render the cubes
function render() {
    setTimeout(function () {
        window.requestAnimationFrame(render);
        var gl = document.getElementById("glcanvas").getContext("experimental-webgl");
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        for (var i = 0; i < cubeBuffer.length; i++) {
            if (cube_rotate) cubeBuffer[i].animation(speedArray[i], rotationAxisArray[i]);
            if (texture_rotate && i == 0) cubeBuffer[i].textureRotation(rotationTextureSpeed, vec2(0.5, 0.5));
            if (texture_scroll && i == 1) cubeBuffer[i].textureTranslation(0, -0.01);
            cubeBuffer[i].bind(gl);
            cubeBuffer[i].draw(gl);
        }
    }, 16)
}

// define the functionality of each key pressed 
function keyPressed(event) {
    // check the type of browser and get the key pressed
    var eventObject = window.event ? event : e; // event for IE, e for FireFox
    var keyUnicode = eventObject.charCode ? eventObject.charCode : eventObject.keyCode;
    var Key = String.fromCharCode(keyUnicode);

    // get the canvas of WebGL for implementing events
    var gl = document.getElementById("glcanvas").getContext("experimental-webgl");
    if (!gl) {
        return null;
    }

    if (Key == 'I') { // move the camera forward
        camera.forward();
    }
    else if (Key == 'O') { // move the camera backward
        camera.backward();
    }
    else if (Key == 'R') { // start and stop the rotation of both cubes
        if (!cube_rotate) 
			cube_rotate = true;
        else 
			cube_rotate = false;
    }
    else if (Key == 'T') { // start and stop the rotation of texture map on the cube from step #3
        if (!texture_rotate) 
			texture_rotate = true;
        else 
			texture_rotate = false;
    }
    else if (Key == 'S') { // start and stop the continous scrolling of texture map on the cube from step #4
        if (!texture_scroll) 
			texture_scroll = true;
        else 
			texture_scroll = false;
    }
    else if (Key == 'R') { // reset to the inital position
        camera.init(camera.initial[0], camera.initial[1], camera.initial[2], 0);
    }
}
/**
 * @Instructions
 * 		@task1 : Complete the setTexture function to handle non power of 2 sized textures
 * 		@task2 : Implement the lighting by modifying the fragment shader, constructor,
 *      @task3: 
 *      @task4: 
 * 		setMesh, draw, setAmbientLight, setSpecularLight and enableLighting functions 
 */


function GetModelViewProjection(projectionMatrix, translationX, translationY, translationZ, rotationX, rotationY) {
	
	var trans1 = [
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		translationX, translationY, translationZ, 1
	];
	var rotatXCos = Math.cos(rotationX);
	var rotatXSin = Math.sin(rotationX);

	var rotatYCos = Math.cos(rotationY);
	var rotatYSin = Math.sin(rotationY);

	var rotatx = [
		1, 0, 0, 0,
		0, rotatXCos, -rotatXSin, 0,
		0, rotatXSin, rotatXCos, 0,
		0, 0, 0, 1
	]

	var rotaty = [
		rotatYCos, 0, -rotatYSin, 0,
		0, 1, 0, 0,
		rotatYSin, 0, rotatYCos, 0,
		0, 0, 0, 1
	]

	var test1 = MatrixMult(rotaty, rotatx);
	var test2 = MatrixMult(trans1, test1);
	var mvp = MatrixMult(projectionMatrix, test2);

	return mvp;
}


class MeshDrawer {
	// The constructor is a good place for taking care of the necessary initializations.

	setSpecularLight(value) {
		gl.useProgram(this.prog);
		gl.uniform1f(this.shininessLoc, value);
	}
	constructor() {
		this.prog = InitShaderProgram(meshVS, meshFS);
		this.mvpLoc = gl.getUniformLocation(this.prog, 'mvp');
		this.showTexLoc = gl.getUniformLocation(this.prog, 'showTex');

		this.colorLoc = gl.getUniformLocation(this.prog, 'color');

		this.vertPosLoc = gl.getAttribLocation(this.prog, 'pos');
		this.texCoordLoc = gl.getAttribLocation(this.prog, 'texCoord');


		this.vertbuffer = gl.createBuffer();
		this.texbuffer = gl.createBuffer();

		this.numTriangles = 0;

		/**
		 * @Task2 : You should initialize the required variables for lighting here
		 */
	
		// New variables for lighting
		this.enableLightingLoc = gl.getUniformLocation(this.prog, 'enableLighting');
		this.ambientLoc = gl.getUniformLocation(this.prog, 'ambient');
		this.lightPosLoc = gl.getUniformLocation(this.prog, 'lightPos');
	
	
		this.shininessLoc = gl.getUniformLocation(this.prog, 'shininess');
		this.viewPosLoc = gl.getUniformLocation(this.prog, 'viewPos');
	}

	setMesh(vertPos, texCoords, normalCoords) {
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertbuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);

		// update texture coordinates
		gl.bindBuffer(gl.ARRAY_BUFFER, this.texbuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);

		this.normbuffer = gl.createBuffer(); // Create a buffer for normals
		gl.bindBuffer(gl.ARRAY_BUFFER, this.normbuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normalCoords), gl.STATIC_DRAW);
		this.numTriangles = vertPos.length / 3;

		this.normalLoc = gl.getAttribLocation(this.prog, 'normal');
		gl.bindBuffer(gl.ARRAY_BUFFER, this.normbuffer);
		gl.enableVertexAttribArray(this.normalLoc);
		gl.vertexAttribPointer(this.normalLoc, 3, gl.FLOAT, false, 0, 0);
		/**
		 * @Task2 : You should update the rest of this function to handle the lighting
		 */
	}

	// This method is called to draw the triangular mesh.
	// The argument is the transformation matrix, the same matrix returned
	// by the GetModelViewProjection function above.
	draw(trans) {
		gl.useProgram(this.prog);
		
		// Calculate camera transformations
		const viewMatrix = CalculateViewMatrix();
		
		// Update light position
		updateLightPos(viewMatrix);
		
		// Send Model-View-Projection matrix to the shader
		gl.uniformMatrix4fv(this.mvpLoc, false, trans);
		
		// Send light position to the shader
		gl.uniform3f(this.lightPosLoc, lightX, lightY, 1.0);
		
		// Load geometry data
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertbuffer);
		gl.enableVertexAttribArray(this.vertPosLoc);
		gl.vertexAttribPointer(this.vertPosLoc, 3, gl.FLOAT, false, 0, 0);
		
		gl.bindBuffer(gl.ARRAY_BUFFER, this.texbuffer);
		gl.enableVertexAttribArray(this.texCoordLoc);
		gl.vertexAttribPointer(this.texCoordLoc, 2, gl.FLOAT, false, 0, 0);
		
		// Set shader parameters
		gl.uniform1i(this.enableLightingLoc, document.getElementById('enable-light').checked ? 1 : 0);
		gl.uniform3f(this.viewPosLoc, 0.0, 0.0, 3.0); // Camera position
		gl.uniform1f(this.shininessLoc, document.getElementById('specular-light-setter').value);
		
		// **Send mixRatio and enableMultiTexture values to the shader**
		const mixRatio = document.getElementById('mix-ratio-slider').value / 100; // Get mix ratio from slider
		console.log(`Current mixRatio: ${mixRatio}`); // Log mixRatio value
		gl.uniform1f(gl.getUniformLocation(this.prog, 'mixRatio'), mixRatio); 
		
		// Enable enableMultiTexture if blendTexture is loaded
		if (this.blendTextureLoaded) {
			gl.uniform1i(gl.getUniformLocation(this.prog, 'enableMultiTexture'), 1);
			console.log(`BlendTexture loaded`); // Log if BlendTexture is loaded
		} else {
			gl.uniform1i(gl.getUniformLocation(this.prog, 'enableMultiTexture'), 0);
			console.log(`BlendTexture not loaded yet`); 
		}
		
		// Execute the draw call
		gl.drawArrays(gl.TRIANGLES, 0, this.numTriangles);
	}
	
	// This method is called to set the texture of the mesh.
	// The argument is an HTML IMG element containing the texture data.
	setTexture(baseImg, blendImg = null, mixRatio = 0.5) {
		if (!(baseImg instanceof HTMLImageElement)) {
			console.error('Base texture must be an HTMLImageElement.');
			return;
		}
	
		// Initialize base texture
		const baseTexture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, baseTexture);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, baseImg);
	
		// Configure base texture parameters
		if (isPowerOf2(baseImg.width) && isPowerOf2(baseImg.height)) {
			gl.generateMipmap(gl.TEXTURE_2D);
		} else {
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		}
	
		gl.useProgram(this.prog);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, baseTexture);
		gl.uniform1i(gl.getUniformLocation(this.prog, 'baseTexture'), 0);
	
		console.log("Checking if BlendImg is provided..."); 
	
		// Handle blend texture
		if (blendImg) {
			console.log("Processing BlendImg...");
			if (!(blendImg instanceof HTMLImageElement)) {
				console.warn('Blend texture must be an HTMLImageElement. Skipping blend texture.');
				this.blendTextureLoaded = false; // Blend texture not loaded
			} else {
				const blendTexture = gl.createTexture();
				gl.bindTexture(gl.TEXTURE_2D, blendTexture);
				gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, blendImg);
	
				// Configure blend texture parameters
				if (isPowerOf2(blendImg.width) && isPowerOf2(blendImg.height)) {
					gl.generateMipmap(gl.TEXTURE_2D);
				} else {
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
				}
	
				gl.activeTexture(gl.TEXTURE1);
				gl.bindTexture(gl.TEXTURE_2D, blendTexture);
				gl.uniform1i(gl.getUniformLocation(this.prog, 'blendTexture'), 1);
	
				// Enable multi-texture functionality
				gl.uniform1i(gl.getUniformLocation(this.prog, 'enableMultiTexture'), 1);
				this.blendTextureLoaded = true; // Blend texture successfully loaded
			}
		} else {
			console.warn("No second texture provided. Only the base texture will be used.");
			this.blendTextureLoaded = false; // No blend texture
		}
	
		// Set mix ratio
		gl.uniform1f(gl.getUniformLocation(this.prog, 'mixRatio'), blendImg ? mixRatio : 0.5);
	}
	

	showTexture(show) {
		gl.useProgram(this.prog);
		gl.uniform1i(this.showTexLoc, show);
	}

	enableLighting(show) {
		/**
		 * @Task2 : You should implement the lighting and implement this function
		 */
		gl.useProgram(this.prog);
    	gl.uniform1i(this.enableLightingLoc, show ? 1 : 0);
	}
	
	setAmbientLight(ambient) {
		/**
		 * @Task2 : You should implement the lighting and implement this function
		 */
		gl.useProgram(this.prog);
    	gl.uniform1f(this.ambientLoc, ambient);
	}
}


function isPowerOf2(value) {
	return (value & (value - 1)) == 0;
}

function normalize(v, dst) {
	dst = dst || new Float32Array(3);
	var length = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
	// make sure we don't divide by 0.
	if (length > 0.00001) {
		dst[0] = v[0] / length;
		dst[1] = v[1] / length;
		dst[2] = v[2] / length;
	}
	return dst;
}

function SetSpecularLight(param) {
    meshDrawer.setSpecularLight(param.value);
    DrawScene();
}

/**
 * Updates the mix ratio for blending two textures and redraws the scene.
 * @param {HTMLElement} param - An input element (e.g., slider) whose value determines the mix ratio.
 */
function UpdateMixRatio(param) {
    const mixRatio = param.value / 100;
    console.log(`Updating mix ratio to: ${mixRatio}`);

    // Use the current shader program
    gl.useProgram(meshDrawer.prog);
    gl.uniform1f(gl.getUniformLocation(meshDrawer.prog, 'mixRatio'), mixRatio);

	DrawScene();
}

// Vertex shader source code
const meshVS = `
			attribute vec3 pos; 
			attribute vec2 texCoord; 
			attribute vec3 normal;

			uniform mat4 mvp; 

			varying vec2 v_texCoord; 
			varying vec3 v_normal; 

			void main()
			{
				v_texCoord = texCoord;
				v_normal = normal;

				gl_Position = mvp * vec4(pos,1);
			}`;

// Fragment shader source code
/**
 * @Task2 : You should update the fragment shader to handle the lighting
 */
const meshFS = `
precision mediump float;

// Uniform variables for multi-texturing
uniform bool enableMultiTexture;     // Is multi-texturing enabled?
uniform sampler2D baseTexture;       // Primary texture
uniform sampler2D blendTexture;      // Secondary texture for blending
uniform float mixRatio;              // Mixing ratio for blending

// Uniform variables for lighting
uniform bool enableLighting;         // Is lighting enabled?
uniform vec3 lightPos;               // Light position
uniform float ambient;               // Ambient light intensity
uniform float shininess;             // Shininess factor for specular highlights
uniform vec3 viewPos;                // Camera position

// Varying variables passed from the vertex shader
varying vec2 v_texCoord;             // Texture coordinates
varying vec3 v_normal;               // Normal vectors

void main() {
    // Sample colors from both textures
    vec4 baseColor = texture2D(baseTexture, v_texCoord);
    vec4 blendColor = texture2D(blendTexture, v_texCoord);
    vec4 finalColor;

    // Handle multi-texturing
    if (enableMultiTexture) {
        // Blend the two textures based on the mix ratio
        finalColor = mix(baseColor, blendColor, mixRatio);

        // Optionally adjust the alpha channel for transparency effects
        finalColor.a = mixRatio; // Set alpha based on mix ratio
    } else {
        finalColor = baseColor; // Use only the primary texture
    }

    // Apply lighting calculations
    if (enableLighting) {
        // Normalize the normal vector and light direction
        vec3 norm = normalize(v_normal);
        vec3 lightDir = normalize(lightPos);

        // Calculate ambient lighting
        vec3 ambientLight = ambient * vec3(1.0, 1.0, 1.0);

        // Calculate diffuse lighting (Lambertian reflectance)
        float diff = max(dot(norm, lightDir), 0.0);
        vec3 diffuseLight = diff * vec3(1.0, 1.0, 1.0);

        // Calculate specular highlights (Phong reflection model)
        vec3 viewDir = normalize(viewPos - vec3(v_texCoord, 0.0));
        vec3 reflectDir = reflect(-lightDir, norm);
        float spec = pow(max(dot(viewDir, reflectDir), 0.0), shininess);
        vec3 specularLight = spec * vec3(1.0, 1.0, 1.0);

        // Combine all lighting components
        vec3 lightResult = ambientLight + diffuseLight + specularLight;

        // Apply lighting to the final color
        finalColor.rgb *= lightResult;
    }

    // Set the fragment color output
    gl_FragColor = finalColor;
}`;

// Light direction parameters for Task 2
var lightX = 1;
var lightY = 1;

const keys = {};
function updateLightPos(viewMatrix) {
    const translationSpeed = 1;
    const rotationSpeed = parseFloat(document.getElementById('rotation-speed').value) * 0.0005;

    // Update light position during auto-rotation
    if (document.getElementById('auto-rotate').checked) {
        const direction = -1; // Inverse rotation direction
        lightX += direction * Math.sin(autorot) * rotationSpeed;
        lightY += direction * Math.cos(autorot) * rotationSpeed;
    }

    // Manual light control using arrow keys
    if (keys['ArrowUp']) lightY -= translationSpeed;
    if (keys['ArrowDown']) lightY += translationSpeed;
    if (keys['ArrowRight']) lightX -= translationSpeed;
    if (keys['ArrowLeft']) lightX += translationSpeed;

    // Update light position based on camera rotation
    if (viewMatrix) {
        const transformedLightPos = TransformLightPosition([lightX, lightY, 1.0], viewMatrix);
        lightX = transformedLightPos[0];
        lightY = transformedLightPos[1];
    }
}

function TransformLightPosition(lightPos, viewMatrix) {
    const [x, y, z] = lightPos;
    const transformed = [
        viewMatrix[0] * x + viewMatrix[4] * y + viewMatrix[8] * z + viewMatrix[12],
        viewMatrix[1] * x + viewMatrix[5] * y + viewMatrix[9] * z + viewMatrix[13],
        viewMatrix[2] * x + viewMatrix[6] * y + viewMatrix[10] * z + viewMatrix[14],
    ];
    return transformed;
}

function CalculateViewMatrix() {
    const rotYMatrix = [
        Math.cos(autorot), 0, Math.sin(autorot), 0,
        0, 1, 0, 0,
        -Math.sin(autorot), 0, Math.cos(autorot), 0,
        0, 0, 0, 1
    ];

    const transMatrix = [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, -3, // Position the camera 3 units back along the -z axis
        0, 0, 0, 1
    ];

    return MatrixMult(rotYMatrix, transMatrix);
}

const lightRotationSpeedMultiplier = 1.2; // Speed multiplier for light position updates

let autoRotateChecked = false; // Variable to store the state of the auto-rotate checkbox

// Check the state of the auto-rotate checkbox on window load
window.onload = function () {
    const autoRotateCheckbox = document.getElementById('auto-rotate');
    if (autoRotateCheckbox) {
        autoRotateChecked = autoRotateCheckbox.checked;

        // Update the state when the checkbox is toggled
        autoRotateCheckbox.addEventListener('change', () => {
            autoRotateChecked = autoRotateCheckbox.checked;
        });
    } else {
        console.error("Checkbox 'auto-rotate' not found.");
    }
};

function CompileShader(type, source) {
	const shader = gl.createShader(type);
	gl.shaderSource(shader, source);
	gl.compileShader(shader);

	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		console.error(`Shader compile error (${type === gl.VERTEX_SHADER ? 'VERTEX' : 'FRAGMENT'}):`, gl.getShaderInfoLog(shader));
		gl.deleteShader(shader);
		return null;
	}
	return shader;
}

function InitShaderProgram(vsSource, fsSource) {
	const vs = CompileShader(gl.VERTEX_SHADER, vsSource);
	const fs = CompileShader(gl.FRAGMENT_SHADER, fsSource);

	if (!vs || !fs) {
		console.error('Shader compilation failed. Aborting shader program initialization.');
		return null;
	}

	const prog = gl.createProgram();
	gl.attachShader(prog, vs);
	gl.attachShader(prog, fs);
	gl.linkProgram(prog);

	if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
		console.error('Shader program link error:', gl.getProgramInfoLog(prog));
		gl.deleteProgram(prog);
		return null;
	}
	return prog;
}

function LoadTexture2(param) {
    const baseFile = document.getElementById('texture').files[0];
    if (!baseFile) {
        console.error("Base texture file is not selected.");
        return;
    }

    if (param.files && param.files[0]) {
        const readerBase = new FileReader();
        const readerBlend = new FileReader();

        readerBase.onload = function (eBase) {
            const baseImg = new Image();
            baseImg.src = eBase.target.result;
            baseImg.onload = function () {
                readerBlend.onload = function (eBlend) {
                    const blendImg = new Image();
                    blendImg.src = eBlend.target.result;
                    blendImg.onload = function () {
                        meshDrawer.setTexture(baseImg, blendImg, 0.5);
                        DrawScene();
                    };
                };

                readerBlend.readAsDataURL(param.files[0]);
            };
        };

        readerBase.readAsDataURL(baseFile);
    }
}
///////////////////////////////////////////////////////////////////////////////////
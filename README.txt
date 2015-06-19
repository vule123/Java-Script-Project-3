Name: Vu Le
UID: 004497690

Assignment 3:

1. Implement functionality to load 2 square images into texture maps. The images are loaded into the texture in the function init() in the object Cube().

2. The entire first texture is applied to each face of the first cube. The texture coordinates range from 0 to 1 in both the s and t dimensions.

3. Create a second cube where the second image texture is applied to each face and is zoomed out by 50%. This is done by modifying the texture coordinates. The aspect ratio of the image is maintained on the face of the cube.

4. Apply Mip Mapping to the texture of the second cube using tri-linear filtering. Filtering for the texture of the first cube uses nearest neighbor.

5. Place both cubes in the starting camera view. The first cube is at (-3, 0, 0), and the second cube is at (3, 0, 0) in the world coordinates. 

6. The keys 'i' and 'o' are to move the camera nearer or farther away from the cubes. 

EXTRA CREDIT

1. The key 'r' is used to start and stop the rotation of both cubes. The first cube rotates around its Y-axis at 10rpm, and the second cube rotates around its X-axis at 5rpm.

2. The key 't' is used to start and stop the rotation of the texture maps on all faces of the first cube around the center of each face. The rotation speed is 15rpm.

3. The key 's' is used to start and stop the continuous scrolling of the texture maps on the second cube. The texture wrap mode is applied here to make the image repeat.

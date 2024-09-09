# 把体素转为网格体

改变自[nii2mesh](https://github.com/neurolabusc/nii2mesh.git)和[nii2meshWeb](https://github.com/rordenlab/nii2meshWeb)，目的是为了在js中把`engine_256x256x128_uint8.raw`转为`engine_256x256x128_uint8_raw.obj`

修改内容记录

1. 这是一个clion创建的cmake的C99规范的C可执行程序项目
2. 在voxel2mesh/main.c中调试，修改了simplify函数和main函数，删除没用到的一些函数
3. src/nii2mesh.c -> src/nii2mesh-old.c
4. 调试完成后把main.c复制为src/nii2mesh.c
5. make wasm
6. 复制nii2mesh.js到public/voxel2mesh/voxel2mesh.js
7. 复制nii2mesh.wasm到public/voxel2mesh/voxel2mesh.wasm

第4-7步写入到了build.hs脚本

## example
```c
//voxel2mesh/src/main.c中main函数
int main(int argc, char **argv)
{
    printf("test start\n");
    float isolevel = 19.992;
    bool onlyLargest = false;
    bool fillBubbles = false;
    float postSmoothF = 0.0;
    const char *raw_file_path = "/home/catnuko/voxel-render/public/volumeModels/engine_256x256x128_uint8.raw";
    const char *export_path = "/home/catnuko/voxel-render/public/volumeModels/engine_256x256x128_uint8_raw.obj";
    short width = 256;
    short height = 256;
    short depth = 128;
    bool verbose = true;
    float reduceFraction = 0.3;
    return simplify_impl(raw_file_path, width, height, depth, reduceFraction, export_path, isolevel, onlyLargest, fillBubbles, postSmoothF, verbose);
}
```
前端参考`voxel2mesh/voxel2mesh.vue`文件
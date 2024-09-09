cmake_minimum_required(VERSION 3.25)
project(voxel2mesh C)
set(CMAKE_C_STANDARD 99)

add_definitions(-DHAVE_FORMATS)
add_definitions(-DNII2MESH)
add_definitions(-DHAVE_ZLIB)

list(APPEND CFILES
        src/isolevel.c
        src/meshify.c
        src/quadric.c
        src/bwlabel.c
        src/radixsort.c
        src/MarchingCubes.c
        src/main.c
        src/base64.c
)
add_executable(voxel2mesh ${CFILES})#sfd
target_link_libraries(voxel2mesh m z)

IF(__EMSCRIPTEN__)
set_target_properties(
        voxel2mesh
        PROPERTIES
        COMPILE_FLAGS "-O3 -std=c++gnu99"
        LINK_FLAGS "-s DEMANGLE_SUPPORT=1 -s EXPORTED_RUNTIME_METHODS=\"['ccall', 'cwrap', 'FS_createDataFile', 'FS_readFile', 'FS_unlink']\" -s ALLOW_MEMORY_GROWTH=1 -s WASM=1-s EXPORTED_FUNCTIONS=\"['_simplify']\""
)
endif ()
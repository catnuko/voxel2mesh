#!/bin/bash
cp src/main.c src/nii2mesh.c
cd src
make wasm
cp voxel2mesh.js voxel2mesh.wasm ../../public/voxel2mesh/

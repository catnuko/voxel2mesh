// gcc -O3 -DNII2MESH -DHAVE_ZLIB -DHAVE_JSON nii2mesh.c MarchingCubes.c cJSON.c isolevel.c meshify.c quadric.c base64.c bwlabel.c radixsort.c -o nii2mesh -lz -lm
// clang -O1 -g -fsanitize=address -fno-omit-frame-pointer -DNII2MESH -DHAVE_ZLIB -DHAVE_JSON nii2mesh.c MarchingCubes.c cJSON.c isolevel.c meshify.c quadric.c base64.c bwlabel.c radixsort.c -o nii2mesh -lz -lm
// cl -DNII2MESH nii2mesh.c MarchingCubes.c isolevel.c meshify.c quadric.c base64.c bwlabel.c radixsort.c

#include <stdio.h>
#include <ctype.h>
#include <stdlib.h>
#include <stdint.h>
#include <math.h>
#include <string.h>
#ifdef _MSC_VER

#else
#include <unistd.h>
#endif
#include "meshify.h"
#include "nifti1.h"
#include "quadric.h"
#include "isolevel.h"
#if defined(_OPENMP)
#include <omp.h>
#endif
#ifdef HAVE_ZLIB
#include <zlib.h>
#endif
#ifdef _MSC_VER
#define F_OK 0
#endif

#define STR_HELPER(x) #x
#define STR(x) STR_HELPER(x)

#if defined(__ICC) || defined(__INTEL_COMPILER)
#define kCCsuf " IntelCC" STR(__INTEL_COMPILER)
#elif defined(_MSC_VER)
#define kCCsuf " MSC" STR(_MSC_VER)
#elif defined(__clang__)
#define kCCsuf " Clang" STR(__clang_major__) "." STR(__clang_minor__) "." STR(__clang_patchlevel__)
#elif defined(__GNUC__) || defined(__GNUG__)
#define kCCsuf " GCC" STR(__GNUC__) "." STR(__GNUC_MINOR__) "." STR(__GNUC_PATCHLEVEL__)
#else
#define kCCsuf " CompilerNA" // unknown compiler!
#endif
#if defined(__arm__) || defined(__ARM_ARCH)
#define kCPUsuf " ARM"
#elif defined(__x86_64)
#define kCPUsuf " x86-64"
#else
#define kCPUsuf " " // unknown CPU
#endif
#define kdate "v1.0.20211220"

int nii2(nifti_1_header hdr, float *img, int originalMC, float isolevel, float reduceFraction, bool preSmooth, bool onlyLargest, bool fillBubbles, int postSmooth, bool verbose, const char *outnm, int quality)
{
    vec3d *pts = NULL;
    vec3i *tris = NULL;
    int ntri, npt;
    short dim[3] = {hdr.dim[1], hdr.dim[2], hdr.dim[3]};
    if (meshify(img, dim, originalMC, isolevel, &tris, &pts, &ntri, &npt, preSmooth, onlyLargest, fillBubbles, verbose) != EXIT_SUCCESS)
        return EXIT_FAILURE;
    apply_sform(tris, pts, ntri, npt, hdr.srow_x, hdr.srow_y, hdr.srow_z);
    double startTime = clockMsec();
    if (postSmooth > 0)
    {
        laplacian_smoothHC(pts, tris, npt, ntri, 0.1, 0.5, postSmooth, true);
        if (verbose)
            printf("post-smooth: %ld ms\n", timediff(startTime, clockMsec()));
        startTime = clockMsec();
    }
    if ((reduceFraction < 1.0) || (quality > 1))
    {                               // lossless for high quality
        double agressiveness = 7.0; // 7 = default for Simplify.h
        if (quality == 0)           // fast
            agressiveness = 8.0;
        if (quality == 2) // best
            agressiveness = 5.0;
        int startVert = npt;
        int startTri = ntri;
        int target_count = round((float)ntri * reduceFraction);
        quadric_simplify_mesh(&pts, &tris, &npt, &ntri, target_count, agressiveness, verbose, (quality > 1));
        if (verbose)
            printf("simplify vertices %d->%d triangles %d->%d (r = %g): %ld ms\n", startVert, npt, startTri, ntri, (float)ntri / (float)startTri, timediff(startTime, clockMsec()));
        startTime = clockMsec();
    }
    save_mesh(outnm, tris, pts, ntri, npt, (quality > 0));
    if (verbose)
        printf("save %s to disk: %ld ms\n", outnm, timediff(startTime, clockMsec()));
    free(tris);
    free(pts);
    return EXIT_SUCCESS;
}
nifti_1_header create_hdr(short width, short height, short depth)
{
    nifti_1_header hdr;
    hdr.sizeof_hdr = 384;
    //    hdr.data_type
    //    hdr.db_name
    hdr.extents = 0;
    hdr.session_error = 0;
    hdr.regular = 'r';
    //    hdr.dim_info
    hdr.dim[0] = 3;
    hdr.dim[1] = depth;
    hdr.dim[2] = height;
    hdr.dim[3] = width;
    hdr.dim[4] = 1;
    hdr.dim[5] = 1;
    hdr.dim[6] = 1;
    hdr.dim[7] = 1;

    hdr.intent_p1 = 0;
    hdr.intent_p2 = 0;
    hdr.intent_p3 = 0;
    hdr.intent_code = 0;

    hdr.datatype = DT_UINT8;
    hdr.bitpix = 8;
    hdr.slice_start = 0;
    hdr.pixdim[0] = 1;
    hdr.pixdim[1] = 1;
    hdr.pixdim[2] = 1;
    hdr.pixdim[3] = 1;
    hdr.pixdim[4] = 0;
    hdr.pixdim[5] = 0;
    hdr.pixdim[6] = 0;
    hdr.pixdim[7] = 0;
    hdr.vox_offset = 352;
    hdr.scl_slope = 1;
    hdr.scl_inter = 0;
    hdr.slice_end = 0;
    hdr.slice_code = '\0';
    hdr.xyzt_units = '\n';
    hdr.cal_max = 0;
    hdr.cal_min = 0;
    hdr.slice_duration = 0;
    hdr.toffset = 0;
    hdr.glmax = 0;
    hdr.glmin = 0;
    //    hdr.descrip
    //    hdr.aux_file
    hdr.qform_code = 1;
    hdr.sform_code = 1;
    hdr.quatern_b = 0;
    hdr.quatern_c = 0;
    hdr.quatern_d = 1;
    hdr.qoffset_x = 0;
    hdr.qoffset_y = 0;
    hdr.qoffset_z = 0;

    hdr.srow_x[0] = -1;
    hdr.srow_x[1] = 0;
    hdr.srow_x[2] = 0;
    hdr.srow_x[3] = 0;

    hdr.srow_y[0] = 0;
    hdr.srow_y[1] = -1;
    hdr.srow_y[2] = 0;
    hdr.srow_y[3] = 0;

    hdr.srow_z[0] = 0;
    hdr.srow_z[1] = 0;
    hdr.srow_z[2] = 1;
    hdr.srow_z[3] = 0;

    //    hdr.intent_name
    hdr.magic[0] = 'n';
    hdr.magic[1] = '+';
    hdr.magic[2] = '1';
    hdr.magic[3] = '\0';
    return hdr;
};

float *create_img(const char *imgnm, nifti_1_header *hdr)
{
    FILE *fp = fopen(imgnm, "rb");
    if (fp == NULL)
        return NULL;

    int nvox = hdr->dim[1] * hdr->dim[2] * hdr->dim[3];
    float *img32 = (float *)malloc(nvox * sizeof(float));
    int bpp = 2;
    if (hdr->datatype == DT_UINT8)
        bpp = 1;
    if (hdr->datatype == DT_FLOAT32)
        bpp = 4;
    void *imgRaw = (void *)malloc(nvox * bpp);
    size_t sz = fread(imgRaw, nvox * bpp, 1, fp);
    fclose(fp);
    if (sz <= 0)
        return NULL;

    if (hdr->datatype == DT_UINT8)
    {
        uint8_t *img8 = (uint8_t *)imgRaw;
        for (int i = 0; i < nvox; i++)
            img32[i] = (img8[i] * hdr->scl_slope) + hdr->scl_inter;
    }
    else if (hdr->datatype == DT_UINT16)
    {
        uint16_t *img16 = (uint16_t *)imgRaw;
        for (int i = 0; i < nvox; i++)
            img32[i] = (img16[i] * hdr->scl_slope) + hdr->scl_inter;
    }
    else if (hdr->datatype == DT_INT16)
    {
        int16_t *img16 = (int16_t *)imgRaw;
        for (int i = 0; i < nvox; i++)
            img32[i] = (img16[i] * hdr->scl_slope) + hdr->scl_inter;
    }
    else
    {
        float *img32w = (float *)imgRaw;
        for (int i = 0; i < nvox; i++)
            img32[i] = (img32w[i] * hdr->scl_slope) + hdr->scl_inter;
    }
    free(imgRaw);
    return img32;
}
int simplify_impl(const char *file_path, short width, short height, short depth, float reduceFraction, const char *export_path, float isolevel, bool onlyLargest, bool fillBubbles, float postSmoothF, bool verbose)
{
    nifti_1_header hdr = create_hdr(width, height, depth);
    float *img = create_img(file_path, &hdr);

    bool preSmooth = true;
    int postSmooth = round(postSmoothF);
    int quality = 1;
    int originalMC = 0;
    if (img == NULL)
        exit(EXIT_FAILURE);
    int nvox = (hdr.dim[1] * hdr.dim[2] * hdr.dim[3]);
    if (isnan(isolevel))
    { // no a number
        isolevel = setThreshold(img, nvox, 2);
    }
    else if (isinf(isolevel) && isolevel < 0)
    { // negative inifinity
        isolevel = setThreshold(img, nvox, 1);
    }
    else if (isinf(isolevel) && isolevel > 0)
    { // positive infinity
        isolevel = setThreshold(img, nvox, 3);
    }
    if (verbose)
        printf("frac %g isoval %g onlyLargest %d fillBubbles %d smooth %d\n", reduceFraction, isolevel, onlyLargest, fillBubbles, postSmooth);
    int ret = nii2(hdr, img, originalMC, isolevel, reduceFraction, preSmooth, onlyLargest, fillBubbles, postSmooth, verbose, export_path, quality);
    free(img);
    return (ret);
}
#ifdef __EMSCRIPTEN__
//["string", "number","number","number","number", "string", "number","boolean","boolean","number","boolean"], // param
//[filename, width,height,depth,percentage, simplify_name, isoValue, onlyLargest, fillBubbles,postSmooth, verbose]
extern "C"
{
    int simplify(const char *file_path, short width, short height, short depth, float reduceFraction, const char *export_path, float isolevel, bool onlyLargest, bool fillBubbles, float postSmoothF, bool verbose)
    {
        return simplify_impl(file_path, width, height, depth, reduceFraction, export_path, isolevel, onlyLargest, fillBubbles, postSmoothF, verbose);
    }
}
#else
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
#endif
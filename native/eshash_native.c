#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <bcrypt.h>
#include <esabi/esabi.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <wchar.h>

#pragma comment(lib, "bcrypt.lib")

ESABI_INITIALIZE_FUNCTION { (void)argv; (void)argc; return "sha256File_s,crc32File_s,abiRevision_"; }
ESABI_VERSION_FUNCTION { return 1; }
ESABI_FREE_FUNCTION { free(pointer); }
ESABI_TERMINATE_FUNCTION { }

static wchar_t *path_to_wide(const char *path)
{
    int count;
    wchar_t *wide;
    if (path == NULL || path[0] == '\0') return NULL;
    count = MultiByteToWideChar(CP_UTF8, MB_ERR_INVALID_CHARS, path, -1, NULL, 0);
    if (count <= 0) return NULL;
    wide = (wchar_t *)malloc((size_t)count * sizeof(wchar_t));
    if (wide == NULL) return NULL;
    if (MultiByteToWideChar(CP_UTF8, MB_ERR_INVALID_CHARS, path, -1, wide, count) != count) {
        free(wide); return NULL;
    }
    return wide;
}

static FILE *open_input(const char *path)
{
    wchar_t *wide = path_to_wide(path);
    FILE *file = NULL;
    if (wide != NULL) { _wfopen_s(&file, wide, L"rb"); free(wide); }
    return file;
}

ESABI_DIRECT_FUNCTION(abiRevision)
{
    (void)argv;
    if (argc != 0) return ESABI_ERR_BAD_ARGUMENTS;
    esabi_value_set_i32(retval, ESABI_ABI_REVISION);
    return ESABI_OK;
}

ESABI_DIRECT_FUNCTION(crc32File)
{
    FILE *file;
    const char *path;
    uint32_t crc = UINT32_C(0xFFFFFFFF);
    unsigned char buffer[65536];
    size_t count, i;
    unsigned bit;
    if (argc != 1 || (path = esabi_arg_get_string(argv, argc, 0)) == NULL) return ESABI_ERR_BAD_ARGUMENTS;
    file = open_input(path);
    if (file == NULL) return ESABI_ERR_IO;
    while ((count = fread(buffer, 1, sizeof(buffer), file)) != 0) {
        for (i = 0; i < count; ++i) {
            crc ^= buffer[i];
            for (bit = 0; bit < 8; ++bit) crc = (crc >> 1) ^ ((crc & 1) ? UINT32_C(0xEDB88320) : 0);
        }
    }
    if (ferror(file)) { fclose(file); return ESABI_ERR_IO; }
    fclose(file);
    esabi_value_set_u32(retval, crc ^ UINT32_C(0xFFFFFFFF));
    return ESABI_OK;
}

ESABI_DIRECT_FUNCTION(sha256File)
{
    FILE *file;
    const char *path;
    BCRYPT_ALG_HANDLE algorithm = NULL;
    BCRYPT_HASH_HANDLE hash = NULL;
    DWORD object_size = 0;
    unsigned char *object = NULL;
    unsigned char digest[32], buffer[65536];
    char *hex = NULL;
    size_t count;
    ULONG got = 0;
    static const char digits[] = "0123456789abcdef";
    unsigned i;
    NTSTATUS status;
    if (argc != 1 || (path = esabi_arg_get_string(argv, argc, 0)) == NULL) return ESABI_ERR_BAD_ARGUMENTS;
    file = open_input(path);
    if (file == NULL) return ESABI_ERR_IO;
    status = BCryptOpenAlgorithmProvider(&algorithm, BCRYPT_SHA256_ALGORITHM, NULL, 0);
    if (status >= 0) status = BCryptGetProperty(algorithm, BCRYPT_OBJECT_LENGTH, (PUCHAR)&object_size, sizeof(object_size), &got, 0);
    if (status >= 0) { object = (unsigned char *)malloc(object_size); if (object == NULL) status = STATUS_NO_MEMORY; }
    if (status >= 0) status = BCryptCreateHash(algorithm, &hash, object, object_size, NULL, 0, 0);
    while (status >= 0 && (count = fread(buffer, 1, sizeof(buffer), file)) != 0)
        status = BCryptHashData(hash, buffer, (ULONG)count, 0);
    if (ferror(file) && status >= 0) status = (NTSTATUS)0xC0000001L;
    fclose(file);
    if (status >= 0) status = BCryptFinishHash(hash, digest, sizeof(digest), 0);
    if (hash != NULL) BCryptDestroyHash(hash);
    if (algorithm != NULL) BCryptCloseAlgorithmProvider(algorithm, 0);
    free(object);
    if (status < 0) return ESABI_ERR_IO;
    hex = (char *)malloc(65);
    if (hex == NULL) return ESABI_ERR_OUT_OF_MEMORY;
    for (i = 0; i < 32; ++i) { hex[i * 2] = digits[digest[i] >> 4]; hex[i * 2 + 1] = digits[digest[i] & 15]; }
    hex[64] = '\0';
    esabi_value_set_string(retval, hex);
    return ESABI_OK;
}

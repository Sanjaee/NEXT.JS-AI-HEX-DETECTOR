"use client";

import { useState } from "react";
import axios from "axios";
import { FileUpload } from "@/components/ui/file-upload";
import toast from "react-hot-toast";
import Image from "next/image";
import { z } from "zod";
import { LinkPreviewDemo } from "@/components/Follow";

// Skema validasi file menggunakan Zod
const fileSchema = z.object({
  file: z
    .custom<File>((value) => value instanceof File, {
      message: "Harus berupa file yang valid",
    })
    .refine((file) => file.size <= 3 * 1024 * 1024, {
      message: "Ukuran file maksimal 3MB",
    })
    .refine(
      (file) => ["image/jpeg", "image/png", "image/jpg"].includes(file.type),
      { message: "Hanya mendukung file berformat JPEG atau PNG" }
    ),
});

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [hexColor, setHexColor] = useState<string>("");
  const [preview, setPreview] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [previousHash, setPreviousHash] = useState<string>("");

  // Fungsi hashing menggunakan SHA-256
  const calculateFileHash = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  // Handle perubahan file
  const handleFileChange = async (uploadedFiles: File[]) => {
    if (uploadedFiles.length > 0) {
      const uploadedFile = uploadedFiles[0];

      // Validasi file menggunakan Zod
      const validation = fileSchema.safeParse({ file: uploadedFile });
      if (!validation.success) {
        toast.error(validation.error.errors[0]?.message || "File tidak valid");
        return;
      }

      setFile(uploadedFile);
      setPreview(URL.createObjectURL(uploadedFile));
      setHexColor("");
    }
  };

  // Handle upload file
  const handleUpload = async () => {
    if (!file) {
      toast.error("Silakan upload file terlebih dahulu!");
      return;
    }

    try {
      const currentHash = await calculateFileHash(file);

      // Validasi gambar yang sama
      if (currentHash === previousHash) {
        const loadingToast = toast.loading(
          "Gambar sudah diproses sebelumnya..."
        );

        setTimeout(() => {
          toast.dismiss(loadingToast);
          toast.success("Gambar sudah diproses sebelumnya!");
        }, 2000);

        return;
      }

      setLoading(true);
      const loadingToast = toast.loading("Mengunggah file...");

      const formData = new FormData();
      formData.append("file", file);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl) {
        throw new Error("API URL is not defined");
      }

      const response = await axios.post(apiUrl, formData);

      toast.dismiss(loadingToast);
      toast.success("File berhasil diunggah!");

      setHexColor(response.data.hex_color);
      setPreviousHash(currentHash);
    } catch (error: any) {
      toast.dismiss();

      if (error.response?.status === 413) {
        toast.error("File terlalu besar! Ukuran file harus di bawah 3MB.");
      } else {
        console.error("Error uploading file:", error);
        toast.error("Gagal mengunggah file! Silakan coba lagi.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Fungsi untuk menyalin HEX ke clipboard
  const copyToClipboard = () => {
    if (hexColor) {
      navigator.clipboard
        .writeText(hexColor)
        .then(() => {
          toast.success("Kode HEX berhasil disalin!");
        })
        .catch(() => {
          toast.error("Gagal menyalin kode HEX.");
        });
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <h1 className="text-3xl font-bold mb-4">Detector Warna Hex</h1>

      {/* Komponen Upload File */}
      <FileUpload onChange={handleFileChange} />

      {/* Preview Gambar */}
      {preview && (
        <Image
          width={400}
          height={400}
          src={preview}
          alt="Preview"
          className="w-40 h-40 object-cover mt-4 rounded-lg shadow-md"
        />
      )}

      {/* Tombol Upload */}
      <button
        onClick={handleUpload}
        className={`px-4 py-2 mt-4 text-white rounded ${
          loading
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-black border hover:bg-white hover:text-black hover:border-black"
        } transition duration-300`}
        disabled={loading}
      >
        {loading ? "Memproses..." : "Unggah dan Proses"}
      </button>

      {/* Hasil Warna Dominan */}
      {hexColor && (
        <div className="mt-6 text-center">
          <button
            onClick={copyToClipboard}
            className="mt-2 text-sm text-black "
          >
            <h2 className="text-xl font-semibold mb-2">Click to Copy:</h2>
            <div
              style={{ backgroundColor: hexColor }}
              className="w-24 h-24 mx-auto mb-2 border"
            ></div>
            <p className="text-lg font-medium">{hexColor}</p>
          </button>
        </div>
      )}

      <LinkPreviewDemo />
    </div>
  );
}

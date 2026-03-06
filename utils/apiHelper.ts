// C:\Users\arlan\my-ecommerce\utils\apiHelper.ts

export async function safeFetch(url: string, options: RequestInit = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    // Cek apakah responnya sukses (status 200-299)
    if (!response.ok) {
      throw new Error(`Server Error: ${response.status}`);
    }

    // Cek apakah isinya beneran JSON untuk menghindari error Unexpected Token '<'
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error("Respon bukan JSON (Mungkin error 404/500)");
    }

    const data = await response.json();
    return { success: true, data };
    
  } catch (error: any) {
    console.error("API Fetch Error:", error.message);
    return { success: false, message: error.message || "Koneksi bermasalah" };
  }
}
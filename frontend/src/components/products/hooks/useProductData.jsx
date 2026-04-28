import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const useProductData = () => {
    const API_BASE = "http://localhost:3000/api";
    const API_PRODUCTS = `${API_BASE}/products`;
    const TOKEN_KEY = "accessToken";

    const [activeTab, setActiveTab] = useState("list");
    const [id, setId] = useState("");
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState("");
    const [stock, setStock] = useState("");
    const [price, setPrice] = useState("");
    const [status, setStatus] = useState("");
    const [sku, setSku] = useState("");
    const [supplier, setSupplier] = useState("");
    const [errorProduct, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState([]);
    const { logout } = useAuth();
    const authExpiredHandledRef = useRef(false);

    const handleUnauthorized = useCallback(async () => {
        if (authExpiredHandledRef.current) {
            return;
        }

        authExpiredHandledRef.current = true;
        await logout({ reason: "expired", callApi: false });
    }, [logout]);

    const getAccessToken = () => localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);

    const buildHeaders = (withBody = false) => {
        const token = getAccessToken();
        const headers = {
            ...(withBody ? { "Content-Type": "application/json" } : {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };

        return headers;
    };

    const normalizeProduct = (apiProduct = {}) => ({
        id: apiProduct._id || apiProduct.id || "",
        name: apiProduct.name || "",
        description: apiProduct.description || "",
        category: apiProduct.category || "",
        stock: apiProduct.stock || 0,
        price: parseFloat(apiProduct.price?.toString?.() || 0),
        status: apiProduct.status || "",
        sku: apiProduct.sku || "",
        supplier: apiProduct.supplier || "",
    });

    const extractApiPayload = (payload = {}) => {
        const data = payload?.data ?? null;
        return {
            data,
            message: payload?.message || "",
            errors: payload?.meta?.errors || [],
        };
    };

    const cleanForm = () => {
        setId("");
        setName("");
        setDescription("");
        setCategory("Accesorios");
        setStock(0);
        setPrice(0);
        setStatus("Estable");
        setSku("");
        setSupplier("");
    };

    const fetchData = async () => {
        setLoading(true);
        setError(null);

        try {
            const token = getAccessToken();
            if (!token) {
                await handleUnauthorized();
                return;
            }

            const response = await fetch(API_PRODUCTS, {
                method: "GET",
                headers: buildHeaders(),
                credentials: "include",
            });

            const payload = await response.json().catch(() => ({}));
            const { data, message } = extractApiPayload(payload);

            if (!response.ok) {
                if (response.status === 401) {
                    await handleUnauthorized();
                    return;
                }
                throw new Error(message || "Error al obtener los productos");
            }

            const productList = Array.isArray(data) ? data.map(normalizeProduct) : [];
            setProducts(productList);
        } catch (error) {
            setProducts([]);
            setError(error.message);
            toast.error(error.message || "Error al obtener los usuarios");
        } finally {
            setLoading(false);
        }
    };

    const handleaSubmit = async (formData = null) => {
        const payloadData = formData || {
            name,
            description,
            category,
            stock,
            price,
            status,
            sku,
            supplier,
        };

        const normalizedPayload = {
            name: payloadData.name?.trim() || "",
            description: payloadData.description?.trim() || "",
            category: payloadData.category?.trim() || "",
            stock: Number(payloadData.stock) || 0,
            price: Number(payloadData.price) || 0,
            status: payloadData.status?.trim() || "",
            sku: payloadData.sku?.trim() || "",
            supplier: payloadData.supplier?.trim() || "",
        };

        if (!normalizedPayload.name || !normalizedPayload.category || !normalizedPayload.status || !normalizedPayload.sku || !normalizedPayload.supplier) {
            const message = "Complete todos los campos";
            setError(message);
            toast.error(message);
            return false;
        }

        if (normalizedPayload.price === 0 || normalizedPayload.price <= 0) {
            const message = "Ingrese un precio válido";
            setError(message);
            toast.error(message);
            return false;
        }

        if (normalizedPayload.stock < 0) {
            const message = "Ingrese un stock válido";
            setError(message);
            toast.error(message);
            return false;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch(API_PRODUCTS, {
                method: "POST",
                headers: buildHeaders(true),
                body: JSON.stringify(normalizedPayload),
                credentials: "include",
            });

            const payload = await response.json().catch(() => ({}));
            const { message, errors } = extractApiPayload(payload);

            if (!response.ok) {
                if (response.status === 401) {
                    await handleUnauthorized();
                    return false;
                }
                const backendErrors = Array.isArray(errors) && errors.length > 0 ? `: ${errors.join(", ")}` : "";
                throw new Error((message || "Error al agregar el producto") + backendErrors);
            }

            toast.success(message || "Producto agregado exitosamente");
            setSuccess(message || "Producto agregado exitosamente");
            cleanForm();
            await fetchData();
            return true;
        } catch (error) {
            setError(error.message);
            toast.error(error.message || "Error al registrar el usuario");
            return false;
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const deleteProduct = async (productId) => {
        if (!productId) {
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch(`${API_PRODUCTS}/${productId}`, {
                method: "DELETE",
                headers: buildHeaders(),
                credentials: "include",
            });

            const payload = await response.json().catch(() => ({}));
            const { message } = extractApiPayload(payload);

            if (!response.ok) {
                if (response.status === 401) {
                    await handleUnauthorized();
                    return;
                }
                throw new Error(message || "Error al eliminar el producto");
            }

            toast.success(message || "Producto eliminado exitosamente");
            setSuccess(message || "Producto eliminado exitosamente");
            await fetchData();
        } catch (error) {
            setError(error.message);
            toast.error(error.message || "Error al eliminar el producto");
        } finally {
            setLoading(false);
        }
    };

    const updateProduct = async (productData) => {
        const normalized = normalizeProduct(productData);
        setId(normalized.id);
        setName(normalized.name);
        setDescription(normalized.description);
        setCategory(normalized.category);
        setStock(normalized.stock);
        setPrice(normalized.price);
        setStatus(normalized.status);
        setSku(normalized.sku);
        setSupplier(normalized.supplier)
        setError(null);
        setSuccess(null);
        setActiveTab("form");
    };

    const handleUpdateSubmit = async (formData = null, productId = null) => {
        const targetId = productId || id;
        const payloadData = formData || {
            name,
            description,
            category,
            stock,
            price,
            status,
            sku,
            supplier,
        };

        const normalizedPayload = {
            name: payloadData.name?.trim() || "",
            description: payloadData.description?.trim() || "",
            category: payloadData.category?.trim() || "",
            stock: payloadData.stock?.trim() || 0,
            price: payloadData.price?.trim() || 0.00,
            status: payloadData.status?.trim() || "",
            sku: payloadData.sku?.trim() || "",
            supplier: payloadData.supplier?.trim() || "",
        };

        if (!targetId) {
            const message = "No se encontró el producto a actualizar";
            setError(message);
            toast.error(message);
            return false;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch(`${API_PRODUCTS}/${targetId}`, {
                method: "PUT",
                headers: buildHeaders(true),
                body: JSON.stringify(normalizedPayload),
                credentials: "include",
            });

            const payload = await response.json().catch(() => ({}));
            const { message, errors } = extractApiPayload(payload);

            if (!response.ok) {
                if (response.status === 401) {
                    await handleUnauthorized();
                    return false;
                }
                const backendErrors = Array.isArray(errors) && errors.length > 0 ? `: ${errors.join(", ")}` : "";
                throw new Error((message || "Error al actualizar el producto") + backendErrors);
            }

            toast.success(message || "Prodcucto actualizado exitosamente");
            setSuccess(message || "Producto actualizado exitosamente");
            cleanForm();
            setActiveTab("list");
            await fetchData();
            return true;
        } catch (error) {
            setError(error.message);
            toast.error(error.message || "Error al actualizar el producto");
            return false;
        } finally {
            setLoading(false);
        }
    };

    return {
        activeTab,
        setActiveTab,
        id,
        setId,
        name,
        setName,
        description,
        setDescription,
        category,
        setCategory,
        stock,
        setStock,
        price,
        setPrice,
        status,
        setStatus,
        sku,
        setSku,
        supplier,
        setSupplier,
        errorProduct,
        setError,
        success,
        setSuccess,
        loading,
        setLoading,
        products,
        setProducts,
        cleanForm,
        handleaSubmit,
        fetchData,
        deleteProduct,
        updateProduct,
        handleUpdateSubmit,
    };
};

export default useProductData;
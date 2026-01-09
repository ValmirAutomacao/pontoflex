import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';

interface UseSupabaseCRUDOptions<T> {
    table: string;
    select?: string;
    orderBy?: { column: string; ascending?: boolean };
    filters?: { column: string; value: any }[];
}

interface UseSupabaseCRUDReturn<T> {
    data: T[];
    loading: boolean;
    error: string | null;
    refresh: () => void;
    create: (item: Partial<T>) => Promise<{ success: boolean; data?: T; error?: string }>;
    update: (id: string, item: Partial<T>) => Promise<{ success: boolean; error?: string }>;
    remove: (id: string) => Promise<{ success: boolean; error?: string }>;
}

export function useSupabaseCRUD<T extends { id: string }>(
    options: UseSupabaseCRUDOptions<T>
): UseSupabaseCRUDReturn<T> {
    const [data, setData] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const { table, select = '*', orderBy, filters } = options;

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);

        let query = supabase.from(table).select(select);

        if (filters) {
            filters.forEach(f => {
                query = query.eq(f.column, f.value);
            });
        }

        if (orderBy) {
            query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
        }

        const { data: result, error: err } = await query;

        if (err) {
            setError(err.message);
            setData([]);
        } else {
            setData((result || []) as unknown as T[]);
        }

        setLoading(false);
    }, [table, select, orderBy, filters]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const create = async (item: Partial<T>): Promise<{ success: boolean; data?: T; error?: string }> => {
        const { data: result, error: err } = await supabase
            .from(table)
            .insert([item])
            .select()
            .single();

        if (err) {
            return { success: false, error: err.message };
        }

        setData(prev => [...prev, result as T]);
        return { success: true, data: result as T };
    };

    const update = async (id: string, item: Partial<T>): Promise<{ success: boolean; error?: string }> => {
        const { error: err } = await supabase
            .from(table)
            .update(item)
            .eq('id', id);

        if (err) {
            return { success: false, error: err.message };
        }

        setData(prev => prev.map(d => d.id === id ? { ...d, ...item } : d));
        return { success: true };
    };

    const remove = async (id: string): Promise<{ success: boolean; error?: string }> => {
        const { error: err } = await supabase
            .from(table)
            .delete()
            .eq('id', id);

        if (err) {
            return { success: false, error: err.message };
        }

        setData(prev => prev.filter(d => d.id !== id));
        return { success: true };
    };

    return {
        data,
        loading,
        error,
        refresh: fetchData,
        create,
        update,
        remove
    };
}

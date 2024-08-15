import express from "express";

export const getEmotionalSupport = async (req, res) => {
    try {
        const support = await getEmotionalSupport();
        res.json(support);
    } catch (error) {
        res.status(500).json({ error: 'Something went wrong' });
    }
};

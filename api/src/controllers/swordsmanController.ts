import type { Request, Response } from 'express';
import * as swordsmanService from '../services/swordsmanService.js';
import type { ApiResponse } from '../../../shared/types.js';

export const getSwordsmen = (req: Request, res: Response) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
  const swordsmen = swordsmanService.getSwordsmen(limit);
  
  const response: ApiResponse<typeof swordsmen> = {
    code: 200,
    message: 'success',
    data: swordsmen,
  };
  
  res.json(response);
};

export const getLatestSwordsmen = (req: Request, res: Response) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 4;
  const swordsmen = swordsmanService.getLatestSwordsmen(limit);
  
  const response: ApiResponse<typeof swordsmen> = {
    code: 200,
    message: 'success',
    data: swordsmen,
  };
  
  res.json(response);
};

export const getSwordsmanById = (req: Request, res: Response) => {
  const { id } = req.params;
  const swordsman = swordsmanService.getSwordsmanById(id);
  
  if (!swordsman) {
    const response: ApiResponse<null> = {
      code: 404,
      message: '剑客未找到',
      data: null,
    };
    return res.status(404).json(response);
  }
  
  const response: ApiResponse<typeof swordsman> = {
    code: 200,
    message: 'success',
    data: swordsman,
  };
  
  res.json(response);
};

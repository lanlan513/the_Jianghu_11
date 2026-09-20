import type { Request, Response } from 'express';
import * as sectService from '../services/sectService.js';
import type { ApiResponse } from '../../../shared/types.js';

export const getSects = (req: Request, res: Response) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
  const sects = sectService.getSects(limit);
  
  const response: ApiResponse<typeof sects> = {
    code: 200,
    message: 'success',
    data: sects,
  };
  
  res.json(response);
};

export const getPopularSects = (req: Request, res: Response) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 6;
  const sects = sectService.getPopularSects(limit);
  
  const response: ApiResponse<typeof sects> = {
    code: 200,
    message: 'success',
    data: sects,
  };
  
  res.json(response);
};

export const getSectById = (req: Request, res: Response) => {
  const { id } = req.params;
  const sect = sectService.getSectById(id);
  
  if (!sect) {
    const response: ApiResponse<null> = {
      code: 404,
      message: '门派未找到',
      data: null,
    };
    return res.status(404).json(response);
  }
  
  const response: ApiResponse<typeof sect> = {
    code: 200,
    message: 'success',
    data: sect,
  };
  
  res.json(response);
};

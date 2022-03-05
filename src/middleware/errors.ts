import { ErrorRequestHandler } from 'express'
import { HttpError } from 'http-errors'


const httpErrorMiddleware: ErrorRequestHandler = function(error, req, res, next): void {
    if (res.headersSent) {
        return next(error)
    }
    if (!(error instanceof HttpError)) {
        return next(error)
    }

    res.status(error.status).json({
        error: error.message,
    })
    next()
}

const catchallErrorMiddleware: ErrorRequestHandler = function(error, req, res, next) {
    if (error.response && error.response.data) {
        console.error(error.response.data) // eslint-disable-line no-console
    } else {
        console.error(error) // eslint-disable-line no-console
    }
    if (error.statusCode) {
        res.status(error.statusCode).send(error.message)
    } else {
        res.status(500).json({
            error: 'Internal Server Error',
        })
    }
}

export { httpErrorMiddleware, catchallErrorMiddleware }

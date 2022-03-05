import * as express from 'express'
import * as morgan from 'morgan'
import * as cors from 'cors'
import * as ip from 'ip'
import { connect, db } from './mongo-connection'
import { router } from './router'
import { httpErrorMiddleware, catchallErrorMiddleware } from './middleware/errors'

const app = express()
app.use(morgan('[:date[iso]] :req[X-Forwarded-For] :method :url :status :res[content-length] - :response-time ms'))
app.use(cors())

app.use(router)
app.use(express.static('public'))

connect()

const port = process.env.PORT || 227

app.listen(port, () => console.log(`Server listening on http://${ip.address()}:${port}`)) // eslint-disable-line no-console

app.use(httpErrorMiddleware)
app.use(catchallErrorMiddleware)
